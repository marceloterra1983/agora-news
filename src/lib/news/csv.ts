import { categoryForCsvRow } from "./csv-category.mjs";
import { storySourceFromAccount } from "./rss-catalog.mjs";
import type { Story } from "./types";

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (ch === "\n") {
      if (cell.endsWith("\r")) cell = cell.slice(0, -1);
      row.push(cell);
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += ch;
  }
  if (cell.endsWith("\r")) cell = cell.slice(0, -1);
  if (cell || row.length) {
    row.push(cell);
    if (row.some((c) => c.trim())) rows.push(row);
  }
  return rows;
}

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function col(header: string[], row: string[], ...names: string[]): string {
  const wanted = names.map(norm);
  const idx = header.findIndex((h) => wanted.includes(norm(h)));
  return (idx >= 0 ? row[idx] : "")?.trim() ?? "";
}

function extractImage(media: string, imageCol: string): string | null {
  const blob = `${imageCol} ${media}`;
  const match = blob.match(/https?:\/\/[^\s)"']+/i);
  const url = match?.[0]?.replace(/[.,);]+$/, "") ?? "";
  if (!url) return null;
  if (/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url) || /pbs\.twimg\.com/i.test(url)) {
    return url;
  }
  return null;
}

function toIso(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (/^\d{4}-\d{2}-\d{2}T/.test(t)) {
    const d = new Date(t);
    return Number.isNaN(+d) ? t : d.toISOString();
  }
  const m = t.match(
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)(?:\s*UTC)?$/,
  );
  if (m) {
    const sec = m[2].length === 5 ? `${m[2]}:00` : m[2];
    const d = new Date(`${m[1]}T${sec}Z`);
    if (!Number.isNaN(+d)) return d.toISOString();
  }
  const d = new Date(t);
  return Number.isNaN(+d) ? t : d.toISOString();
}

function richer(a: Story, b: Story): Story {
  const score = (s: Story) =>
    (s.image ? 4 : 0) +
    (s.title.length > 20 ? 2 : 0) +
    (s.body.length > s.title.length ? 2 : 0) +
    (s.url.startsWith("http") ? 1 : 0);
  return score(b) > score(a) ? b : a;
}

function headlineKey(title: string): string {
  return norm(title.replace(/\([^)]*\)/g, "")).slice(0, 64);
}

export function collapseNearDuplicates(stories: Story[]): Story[] {
  const byKey = new Map<string, Story>();
  for (const story of stories) {
    const key = `${norm(story.source)}|${headlineKey(story.title)}`;
    const prev = byKey.get(key);
    byKey.set(key, prev ? richer(prev, story) : story);
  }
  return [...byKey.values()].sort(
    (a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt),
  );
}

export function mergeStories(...lists: Story[][]): Story[] {
  const byId = new Map<string, Story>();
  for (const list of lists) {
    for (const story of list) {
      const prev = byId.get(story.id);
      byId.set(story.id, prev ? richer(prev, story) : story);
    }
  }
  return collapseNearDuplicates([...byId.values()]);
}

export function storiesFromCsv(text: string): Story[] {
  const rows = parseCsv(text.replace(/^\uFEFF/, ""));
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim());
  const byId = new Map<string, Story>();

  for (const row of rows.slice(1)) {
    const id = col(header, row, "ID do Post", "id", "postid");
    const title = col(header, row, "Síntese (1 linha)", "Sintese", "titulo", "title");
    const body = col(header, row, "Tradução (PT-BR)", "Traducao", "body");
    const original = col(header, row, "Conteúdo", "Conteudo", "original");
    if (!id && !title && !body) continue;
    const account = col(header, row, "Conta de origem", "conta", "source");
    const { source, sourceLabel } = storySourceFromAccount(account);
    const utc = col(header, row, "Data/Hora (UTC)", "utc", "published");
    const sp = col(header, row, "Data/Hora (São Paulo)", "Data/Hora", "sp");
    const publishedAt = toIso(utc || sp);
    const urlRaw = col(header, row, "Link do Post", "link", "url");
    const url =
      urlRaw.startsWith("http")
        ? urlRaw
        : id
          ? `https://x.com/${source}/status/${id}`
          : "";
    const media = col(header, row, "Mídia", "Midia", "media");
    const image = extractImage(media, col(header, row, "Imagem", "image", "foto"));
    const category = categoryForCsvRow(
      source,
      col(header, row, "Categoria", "category", "secao"),
    );
    if (!category) continue;
    const story: Story = {
      id: id || `${source}-${publishedAt}`,
      title: title || body.slice(0, 140) || original.slice(0, 140) || "Sem título",
      excerpt: (body || original).slice(0, 320),
      body: body || original,
      original,
      url,
      image,
      publishedAt: publishedAt || new Date().toISOString(),
      source,
      sourceLabel,
      category,
      media: media || (image ? "Foto" : "Nenhuma"),
      batch: col(header, row, "batch", "planilha") || "AGORA_FEED",
    };
    const prev = byId.get(story.id);
    byId.set(story.id, prev ? richer(prev, story) : story);
  }

  return mergeStories([...byId.values()]);
}
