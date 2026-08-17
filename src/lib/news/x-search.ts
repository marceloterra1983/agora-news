import { profilesFor } from "./profiles";
import { catalogFor, scopeCachedStories } from "./section-catalog.mjs";
import type { Category, Story } from "./types";
import { normalizeSection } from "./types";

const MODEL = "grok-4.5";
const X_TTL_MS = 10 * 60_000;
const HANDLE_LIMIT = 20;

type XCache = { at: number; section: Category; stories: Story[] };
let cache: XCache | null = null;

export type XSyncResult = {
  stories: Story[];
  used: boolean;
  available: boolean;
  error?: string;
};

export function xApiAvailable() {
  return Boolean(process.env.XAI_API_KEY);
}

function scopeXStories(section: Category, stories: Story[]): Story[] {
  return scopeCachedStories(stories, catalogFor(section, { profiles: profilesFor(section) }));
}

export function cachedXStories(section: Category): Story[] {
  if (!cache || cache.section !== section) return [];
  return scopeXStories(section, cache.stories);
}

function handlesFor(section: Category) {
  return profilesFor(section)
    .map((p) => p.handle.replace(/^@/, ""))
    .slice(0, HANDLE_LIMIT);
}

function extractText(body: Record<string, unknown>): string {
  if (typeof body.output_text === "string") return body.output_text;
  const chunks: string[] = [];
  const output = Array.isArray(body.output) ? body.output : [];
  for (const item of output) {
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string") chunks.push(text);
    }
  }
  return chunks.join("\n");
}

function extractCitations(body: Record<string, unknown>): string[] {
  const raw = body.citations;
  if (!Array.isArray(raw)) return [];
  return raw.filter((u): u is string => typeof u === "string");
}

function parseJsonPosts(text: string): Array<Record<string, unknown>> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced?.[1] ?? text).trim();
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start < 0 || end <= start) return [];
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed.filter((row) => row && typeof row === "object") : [];
  } catch {
    return [];
  }
}

function asStory(row: Record<string, unknown>, section: Category): Story | null {
  const id = String(row.id ?? row.post_id ?? "").replace(/\D/g, "");
  const handle = String(row.handle ?? row.conta ?? "fonte").replace(/^@/, "");
  const original = String(row.text ?? row.original ?? row.conteudo ?? "").trim();
  const body = String(row.pt ?? row.traducao ?? original).trim();
  const title = String(row.sintese ?? row.title ?? "").trim() || body.slice(0, 140);
  if (!id && !title) return null;
  const url =
    String(row.url ?? "").startsWith("http")
      ? String(row.url)
      : id
        ? `https://x.com/${handle}/status/${id}`
        : "";
  const imageRaw = row.image;
  const image = typeof imageRaw === "string" && imageRaw.startsWith("http") ? imageRaw : null;
  const published = String(row.publishedAt ?? row.date ?? "");
  const publishedAt = Number.isNaN(Date.parse(published)) ? new Date().toISOString() : new Date(published).toISOString();
  return {
    id: id || `${handle}-${publishedAt}`,
    title,
    excerpt: body.slice(0, 320),
    body: body || original,
    original,
    url,
    image,
    publishedAt,
    source: handle,
    sourceLabel: `@${handle}`,
    category: normalizeSection(section),
    media: image ? "Foto" : "Nenhuma",
    batch: "x-api",
  };
}

function storiesFromCitations(urls: string[], section: Category): Story[] {
  const out: Story[] = [];
  for (const url of urls) {
    const m = url.match(/x\.com\/(?:i\/status|([^/?#]+)\/status)\/(\d+)/i);
    if (!m?.[2]) continue;
    const handle = m[1] && m[1] !== "i" ? m[1] : "fonte";
    const id = m[2];
    out.push({
      id,
      title: `Post de @${handle}`,
      excerpt: "",
      body: "",
      original: "",
      url: `https://x.com/${handle}/status/${id}`,
      image: null,
      publishedAt: new Date().toISOString(),
      source: handle,
      sourceLabel: `@${handle}`,
      category: section,
      media: "Nenhuma",
      batch: "x-api",
    });
  }
  return out;
}

async function callXSearch(section: Category): Promise<Story[]> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return [];
  const handles = handlesFor(section);
  if (!handles.length) return [];

  const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const to = new Date().toISOString().slice(0, 10);

  const res = await fetch("https://api.x.ai/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(40_000),
    body: JSON.stringify({
      model: MODEL,
      max_output_tokens: 2200,
      input: [
        {
          role: "user",
          content:
            "Busque os posts PRINCIPAIS (sem replies) mais recentes destas contas no X. " +
            "Devolva SOMENTE um JSON array, sem markdown, no máximo 15 itens, mais recente primeiro. " +
            'Formato: [{"id":"id numérico do post","handle":"sem @","text":"texto original",' +
            '"pt":"tradução PT-BR","sintese":"uma linha em PT-BR","url":"https://x.com/handle/status/id",' +
            '"publishedAt":"ISO-8601","image":"url da imagem ou null"}]',
        },
      ],
      tools: [
        {
          type: "x_search",
          allowed_x_handles: handles,
          from_date: from,
          to_date: to,
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`X API ${res.status}`);
  }
  const body = (await res.json()) as Record<string, unknown>;
  const text = extractText(body);
  const fromJson = parseJsonPosts(text)
    .map((row) => asStory(row, section))
    .filter((s): s is Story => Boolean(s));
  if (fromJson.length) return fromJson;
  return storiesFromCitations(extractCitations(body), section);
}

export async function loadXStories(section: Category, force: boolean): Promise<XSyncResult> {
  const available = xApiAvailable();
  if (!available) {
    return {
      stories: cache?.section === section ? scopeXStories(section, cache.stories) : [],
      used: false,
      available,
    };
  }
  const fresh = cache && cache.section === section && Date.now() - cache.at < X_TTL_MS;
  if (!force && fresh) {
    return { stories: scopeXStories(section, cache!.stories), used: true, available };
  }
  if (!force) {
    return {
      stories: cache?.section === section ? scopeXStories(section, cache.stories) : [],
      used: Boolean(cache),
      available,
    };
  }
  try {
    const stories = scopeXStories(section, await callXSearch(section));
    cache = { at: Date.now(), section, stories };
    return { stories, used: stories.length > 0, available };
  } catch (err) {
    return {
      stories: cache?.section === section ? scopeXStories(section, cache.stories) : [],
      used: Boolean(cache),
      available,
      error: err instanceof Error ? err.message : "falha na API do X",
    };
  }
}
