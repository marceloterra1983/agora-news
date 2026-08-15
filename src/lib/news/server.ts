import { createServerFn } from "@tanstack/react-start";
import { fallbackPayload, filterStories, listFallbackCategories, loadFeed, peekStory } from "./feed";
import { enrichFontes, loadFontesFast } from "./influence";
import { blurbFor, profileByHandle, profilesFor } from "./profiles";
import { FEED_SHEET_ID } from "./sheet";
import { downloadPostById, SUPABASE_ANON_KEY, SUPABASE_POSTS_URL } from "./supabase";
import { readStoredProfile } from "./profile-store";
import { DEFAULT_SECTION, normalizeSection, type Category } from "./types";
import { embedForStory } from "./x-media";

function toNews(payload: ReturnType<typeof fallbackPayload>, category: Category, q?: string) {
  return {
    stories: filterStories(payload.stories, category, q).map((s) => ({
      ...s,
      body: s.body || s.excerpt || s.title,
      original: s.original || "",
    })),
    meta: {
      live: payload.live,
      syncedAt: payload.syncedAt,
      folder: payload.folder,
      count: payload.count,
      source: payload.source,
    },
  };
}

export function newsFromFallback(category: Category, q?: string) {
  return toNews(fallbackPayload(category), category, q);
}

export const loadNews = createServerFn({ method: "GET" })
  .validator(
    (
      input:
        | { category?: Category; q?: string; refresh?: boolean; fromX?: boolean; before?: string }
        | undefined,
    ) => ({
      category: normalizeSection(input?.category || DEFAULT_SECTION),
      q: typeof input?.q === "string" ? input.q : undefined,
      refresh: Boolean(input?.refresh),
      fromX: Boolean(input?.fromX),
      before: typeof input?.before === "string" ? input.before : undefined,
    }),
  )
  .handler(async ({ data }) => {
    if (data.before) {
      const { downloadSupabase } = await import("./supabase");
      const older = await downloadSupabase(data.category, { before: data.before, limit: 40 });
      const stories = filterStories(older, data.category, data.q).map((s) => ({
        ...s,
        body: s.excerpt || s.title,
        original: s.original || "",
      }));
      return {
        stories,
        meta: {
          live: true,
          syncedAt: new Date().toISOString(),
          folder: `NEWS/${data.category.toUpperCase()}`,
          count: stories.length,
          source: "supabase",
          hasMore: stories.length >= 40,
        },
      };
    }
    const payload = await loadFeed(data.refresh, data.category, data.fromX);
    const news = toNews(payload, data.category, data.q);
    return {
      ...news,
      meta: { ...news.meta, hasMore: news.stories.length >= 40 },
    };
  });

export const loadStory = createServerFn({ method: "GET" })
  .validator((id: string) => String(id || ""))
  .handler(async ({ data: id }) => {
    const cached = peekStory(id);
    if (cached) return cached;
    const payload = await loadFeed(false);
    const hit = payload.stories.find((s) => s.id === id);
    if (hit) return hit;
    return downloadPostById(id);
  });

export const loadCatalogMeta = createServerFn({ method: "GET" })
  .validator((input: { refresh?: boolean; category?: Category } | undefined) => ({
    refresh: Boolean(input?.refresh),
    category: normalizeSection(input?.category || DEFAULT_SECTION),
  }))
  .handler(async ({ data }) => {
    const payload = await loadFeed(data.refresh, data.category);
    return {
      categories: payload.categories.length ? payload.categories : listFallbackCategories(),
      live: payload.live,
      syncedAt: payload.syncedAt,
      folder: payload.folder,
    };
  });

export const loadFontes = createServerFn({ method: "GET" })
  .validator((input: { category?: Category } | undefined) => ({
    category: normalizeSection(input?.category || DEFAULT_SECTION),
  }))
  .handler(async ({ data }) => {
    const rows = await loadFontesFast(data.category);
    return { rows, live: rows.some((r) => r.followers > 0 || Boolean(r.avatar)) };
  });

export const loadFontesLive = createServerFn({ method: "GET" })
  .validator((input: { category?: Category } | undefined) => ({
    category: normalizeSection(input?.category || DEFAULT_SECTION),
  }))
  .handler(async ({ data }) => {
    try {
      const rows = await enrichFontes(data.category);
      return { rows, live: rows.some((r) => r.followers > 0) };
    } catch {
      const rows = await loadFontesFast(data.category);
      return { rows, live: rows.some((r) => r.followers > 0 || Boolean(r.avatar)) };
    }
  });

const summaryCache = new Map<string, { at: number; line: string }>();
const SUMMARY_TTL = 6 * 60 * 60_000;

function clipOneLine(text: string): string {
  const clean = text
    .replace(/\s+/g, " ")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/#\S+/g, "")
    .replace(/^["“”']+|["“”']+$/g, "")
    .trim();
  if (!clean) return "";
  const sentence = clean.split(/(?<=[.!?])\s+/)[0] ?? clean;
  if (sentence.length <= 160) return sentence;
  const cut = sentence.slice(0, 157);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > 80 ? cut.slice(0, sp) : cut).trimEnd()}…`;
}

function looksPortuguese(text: string): boolean {
  return (
    /[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(text) ||
    /\b(é|da|do|de|um|uma|para|com|no|na|dos|das|pelo|pela)\b/i.test(text)
  );
}

function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !["the", "and", "for", "inc", "llc"].includes(w));
}

function extractMatchesPerson(name: string, handle: string, title: string, extract: string): boolean {
  const hay = `${title} ${extract}`.toLowerCase();
  const h = handle.toLowerCase();
  if (hay.includes(`@${h}`) || hay.includes(h)) return true;
  const toks = nameTokens(name);
  if (!toks.length) return false;
  const hits = toks.filter((t) => hay.includes(t));
  if (toks.length >= 2) return hits.length >= 2;
  return hits.length >= 1 && extract.length < 280;
}

function aiKey(): string {
  return process.env.XAI_API_KEY || process.env.GROK_API_KEY || "";
}

type LastPost = { id: string; text: string; url: string; publishedAt: string };

async function fetchLastPost(handle: string): Promise<LastPost | null> {
  try {
    const res = await fetch(
      `https://api.fxtwitter.com/2/profile/${encodeURIComponent(handle)}/statuses?count=5`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8_000) },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      results?: Array<{
        id?: string;
        text?: string;
        url?: string;
        created_timestamp?: number;
        created_at?: string;
      }>;
    };
    const row = (body.results ?? []).find((t) => t.id && t.text);
    if (!row?.id) return null;
    const publishedAt = row.created_timestamp
      ? new Date(row.created_timestamp * 1000).toISOString()
      : row.created_at
        ? new Date(row.created_at).toISOString()
        : new Date().toISOString();
    return {
      id: String(row.id),
      text: String(row.text).replace(/\s+/g, " ").trim(),
      url: row.url || `https://x.com/${handle}/status/${row.id}`,
      publishedAt,
    };
  } catch {
    return null;
  }
}

function extractLlmText(body: Record<string, unknown>): string {
  const choices = body.choices;
  if (Array.isArray(choices)) {
    const msg = (choices[0] as { message?: { content?: unknown } } | undefined)?.message?.content;
    if (typeof msg === "string") return msg;
  }
  if (typeof body.output_text === "string") return body.output_text;
  const output = Array.isArray(body.output) ? body.output : [];
  const chunks: string[] = [];
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

async function askGrokLine(prompt: string): Promise<string> {
  const key = aiKey();
  if (!key) return "";
  const headers = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  const system =
    "Você resume quem é uma conta do X. Use SOMENTE os dados do usuário. Não invente cargo, empresa, país ou formação. Se a bio for vaga, reformule só o que ela diz. Uma frase em português do Brasil, no máximo 160 caracteres. Sem aspas, emoji, hashtag ou @.";
  try {
    const chat = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(14_000),
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 90,
        temperature: 0,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (chat.ok) {
      const line = clipOneLine(extractLlmText((await chat.json()) as Record<string, unknown>));
      if (line) return line;
    }
  } catch {
    /* try responses */
  }
  try {
    const res = await fetch("https://api.x.ai/v1/responses", {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(14_000),
      body: JSON.stringify({
        model: "grok-4.5",
        max_output_tokens: 90,
        input: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) return "";
    return clipOneLine(extractLlmText((await res.json()) as Record<string, unknown>));
  } catch {
    return "";
  }
}

function plausibleSummary(line: string, name: string, handle: string, bio: string): boolean {
  if (!line) return false;
  const low = line.toLowerCase();
  if (
    low.includes("lex fridman") &&
    !handle.toLowerCase().includes("lex") &&
    !name.toLowerCase().includes("lex")
  ) {
    return false;
  }
  if (/fonte acompanhada no feed/i.test(line)) return false;
  const invented = ["prêmio nobel", "presidente dos estados", "rei de"];
  if (invented.some((w) => low.includes(w) && !`${bio} ${name}`.toLowerCase().includes(w))) {
    return false;
  }
  return true;
}

async function translateLine(text: string): Promise<string> {
  const src = clipOneLine(text);
  if (!src) return "";
  if (looksPortuguese(src)) return src;
  try {
    const g = await fetch(
      `https://translate.googleapis.com/translate_a/single?${new URLSearchParams({
        client: "gtx",
        sl: "auto",
        tl: "pt",
        dt: "t",
        q: src.slice(0, 220),
      })}`,
      { signal: AbortSignal.timeout(6_000) },
    );
    if (g.ok) {
      const data = (await g.json()) as unknown;
      const parts = Array.isArray(data) && Array.isArray(data[0]) ? data[0] : [];
      const out = clipOneLine(
        parts.map((p) => (Array.isArray(p) && typeof p[0] === "string" ? p[0] : "")).join(""),
      );
      if (out) return out;
    }
  } catch {
    /* keep original */
  }
  return src;
}

async function wikiLine(name: string, handle: string): Promise<string> {
  const title = name.trim();
  if (!title) return "";
  const headers = {
    Accept: "application/json",
    "User-Agent": "AgoraNews/1.0 (news reader)",
  };
  const trySummary = async (lang: "pt" | "en", page: string) => {
    const res = await fetch(
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(page)}`,
      { headers, signal: AbortSignal.timeout(6_000) },
    );
    if (!res.ok) return "";
    const body = (await res.json()) as { type?: string; extract?: string; title?: string };
    if (body.type === "disambiguation") return "";
    const extract = body.extract || "";
    const pageTitle = body.title || page;
    if (!extractMatchesPerson(name, handle, pageTitle, extract)) return "";
    return clipOneLine(extract);
  };
  const searchWiki = async (lang: "pt" | "en", q: string) => {
    const search = await fetch(
      `https://${lang}.wikipedia.org/w/api.php?${new URLSearchParams({
        action: "query",
        list: "search",
        srsearch: q,
        srlimit: "3",
        format: "json",
        utf8: "1",
      })}`,
      { headers, signal: AbortSignal.timeout(6_000) },
    );
    if (!search.ok) return "";
    const data = (await search.json()) as {
      query?: { search?: Array<{ title?: string }> };
    };
    for (const hit of data.query?.search ?? []) {
      if (!hit.title) continue;
      const line = await trySummary(lang, hit.title);
      if (line) return line;
    }
    return "";
  };
  try {
    const queries = [`${title} ${handle}`, `"${title}"`];
    for (const q of queries) {
      const pt = await searchWiki("pt", q);
      if (pt) return pt;
    }
    for (const q of queries) {
      const en = await searchWiki("en", q);
      if (en) return looksPortuguese(en) ? en : await translateLine(en);
    }
    return "";
  } catch {
    return "";
  }
}

async function oneLineAbout(handle: string, name: string, bio: string): Promise<string> {
  if (profileByHandle(handle)) return blurbFor(handle, name);
  const key = `v3:${handle.toLowerCase()}`;
  const cached = summaryCache.get(key);
  if (cached && Date.now() - cached.at < SUMMARY_TTL) return cached.line;

  const prompt =
    `Nome: ${name}\nConta: @${handle}\nBio no X: ${bio.slice(0, 320) || "(vazia)"}\n` +
    `Escreva quem é essa pessoa/conta com base só nisso.`;
  const llm = await askGrokLine(prompt);
  const fromLlm = plausibleSummary(llm, name, handle, bio) ? llm : "";
  const fromBio = bio ? await translateLine(bio) : "";
  const fromWiki = fromBio ? "" : await wikiLine(name, handle);
  const line = fromLlm || fromBio || fromWiki;
  if (line) summaryCache.set(key, { at: Date.now(), line });
  return line;
}

export const lookupXProfile = createServerFn({ method: "GET" })
  .validator((input: { handle: string }) => ({
    handle: String(input.handle || "")
      .replace(/^@+/, "")
      .trim()
      .slice(0, 15),
  }))
  .handler(async ({ data }) => {
    const handle = data.handle;
    if (!handle || !/^[A-Za-z0-9_]{1,15}$/.test(handle)) {
      return { found: false as const };
    }
    try {
      const [res, lastGuess] = await Promise.all([
        fetch(`https://api.fxtwitter.com/${encodeURIComponent(handle)}`, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(8_000),
        }),
        fetchLastPost(handle),
      ]);
      if (!res.ok) return { found: false as const };
      const body = (await res.json()) as {
        user?: {
          screen_name?: string;
          name?: string;
          description?: string;
          followers?: number;
          following?: number;
          avatar_url?: string;
          verification?: { verified?: boolean };
        };
      };
      const u = body.user;
      if (!u?.screen_name) return { found: false as const };
      const screen = String(u.screen_name);
      const name = String(u.name || screen);
      const bio = String(u.description || "").trim();
      const avatar =
        typeof u.avatar_url === "string" ? u.avatar_url.replace("_normal.", "_400x400.") : null;
      const lastPost =
        screen.toLowerCase() === handle.toLowerCase() ? lastGuess : await fetchLastPost(screen);
      const stored = profileByHandle(screen) ? null : await readStoredProfile(screen);
      return {
        found: true as const,
        handle: screen,
        name,
        bio,
        summary: profileByHandle(screen)
          ? blurbFor(screen, name)
          : stored?.summary_pt || clipOneLine(bio),
        lastPost,
        followers: Number(u.followers) || 0,
        following: Number(u.following) || 0,
        avatar,
        verified: Boolean(u.verification?.verified),
      };
    } catch {
      return { found: false as const };
    }
  });

export const summarizeProfile = createServerFn({ method: "POST" })
  .validator((input: { handle: string; name: string; bio: string; last?: string }) => ({
    handle: String(input.handle || "")
      .replace(/^@+/, "")
      .trim()
      .slice(0, 15),
    name: String(input.name || "").slice(0, 80),
    bio: String(input.bio || "").slice(0, 400),
    last: String(input.last || "").slice(0, 220),
  }))
  .handler(async ({ data }) => {
    if (!data.handle) return { summary: "" };
    const stored = await readStoredProfile(data.handle);
    const fresh =
      stored?.summary_pt &&
      stored.updated_at &&
      Date.now() - Date.parse(stored.updated_at) < 7 * 24 * 60 * 60_000;
    if (fresh) return { summary: stored.summary_pt, usedLlm: false };
    const summary = await oneLineAbout(data.handle, data.name || data.handle, data.bio);
    return { summary, usedLlm: Boolean(summary && aiKey()) };
  });

export type XUserHit = {
  handle: string;
  name: string;
  avatar: string | null;
  verified: boolean;
  inFeed: boolean;
};

export const searchXUsers = createServerFn({ method: "GET" })
  .validator((input: { q: string }) => ({
    q: String(input.q || "")
      .replace(/^@+/, "")
      .trim()
      .slice(0, 40),
  }))
  .handler(async ({ data }) => {
    const q = data.q;
    if (q.length < 2) return { users: [] as XUserHit[] };
    try {
      const res = await fetch(
        `https://api.fxtwitter.com/2/typeahead?q=${encodeURIComponent(q)}`,
        { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8_000) },
      );
      if (!res.ok) return { users: [] as XUserHit[] };
      const body = (await res.json()) as {
        users?: Array<{
          screen_name?: string;
          name?: string;
          avatar_url?: string;
          verified?: boolean;
          is_blue_verified?: boolean;
        }>;
      };
      const known = new Set(profilesFor().map((p) => p.handle.toLowerCase()));
      const users: XUserHit[] = [];
      const seen = new Set<string>();
      for (const u of body.users ?? []) {
        const handle = String(u.screen_name || "").replace(/^@+/, "");
        if (!handle || seen.has(handle.toLowerCase())) continue;
        seen.add(handle.toLowerCase());
        users.push({
          handle,
          name: String(u.name || handle),
          avatar: typeof u.avatar_url === "string" ? u.avatar_url : null,
          verified: Boolean(u.verified || u.is_blue_verified),
          inFeed: known.has(handle.toLowerCase()),
        });
      }
      return { users };
    } catch {
      return { users: [] as XUserHit[] };
    }
  });

export const loadTweetEmbed = createServerFn({ method: "GET" })
  .validator((input: { id: string; source: string }) => ({
    id: String(input.id || ""),
    source: String(input.source || "").replace(/^@+/, ""),
  }))
  .handler(async ({ data }) => embedForStory(data));

export const debugFeedRead = createServerFn({ method: "GET" }).handler(async () => {
  const probes: Array<{ url: string; ok: boolean; items?: number; error?: string; kind: string }> =
    [];
  const url = `${SUPABASE_POSTS_URL}?select=post_id&limit=3`;
  try {
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      probes.push({ url, ok: false, error: `HTTP ${res.status}`, kind: "supabase" });
    } else {
      const rows = (await res.json()) as unknown;
      probes.push({
        url,
        ok: true,
        items: Array.isArray(rows) ? rows.length : 0,
        kind: "supabase",
      });
    }
  } catch (err) {
    probes.push({
      url,
      ok: false,
      error: err instanceof Error ? err.message : "falha",
      kind: "supabase",
    });
  }
  return {
    note: "O app lê a tabela posts no Supabase. A planilha AGORA_FEED é só legado.",
    sheetId: FEED_SHEET_ID,
    probes,
  };
});
