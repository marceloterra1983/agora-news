import { accountInFilter } from "./account-in-filter.mjs";
import { postedAtQuery } from "./feed-more.mjs";
import { PAGE_SIZE } from "./page-size.mjs";
import { storySourceFromAccount } from "./rss-catalog.mjs";
import { unpackMediaLabel } from "./story-media-meta.mjs";
import { isNewsRow } from "./news-row.mjs";
import { supabaseApiKeyHeaders } from "./supabase-rest";
import { normalizeSection, type Category, type Story } from "./types";

export { isNewsRow };

function env(name: string): string {
  if (typeof process === "undefined" || !process.env) return "";
  return process.env[name] ?? "";
}

/** Fonte canônica do feed — tabela public.posts (anon, só leitura). */
export const SUPABASE_URL =
  env("SUPABASE_URL") ||
  env("VITE_SUPABASE_URL") ||
  "https://uqcaodtgrkphuhdkchyh.supabase.co";

export const SUPABASE_POSTS_URL = `${SUPABASE_URL}/rest/v1/posts`;

type DbPost = {
  post_id: string;
  account: string | null;
  posted_at: string;
  posted_at_sp: string | null;
  content: string | null;
  translation_pt: string | null;
  summary_pt: string | null;
  post_url: string | null;
  media_label: string | null;
  image_url: string | null;
  category: string | null;
  batch_name: string | null;
  source?: string | null;
};

/** Lista do feed: sem content/translation pesados — só o que a card precisa. */
const LIST_SELECT =
  "post_id,account,posted_at,summary_pt,translation_pt,post_url,media_label,image_url,category,batch_name,source";
const FULL_SELECT =
  "post_id,account,posted_at,posted_at_sp,content,translation_pt,summary_pt,post_url,media_label,image_url,category,batch_name,source";

export function supabaseReadHeaders(): Record<string, string> {
  const key = env("SUPABASE_PUBLISHABLE_KEY").trim();
  if (!key) throw new Error("missing_supabase_publishable_key");
  return {
    ...supabaseApiKeyHeaders(key),
    Accept: "application/json",
    Prefer: "count=none",
  };
}

/**
 * Camadas de cache da lista:
 *  WARM  (< 90s)  → devolve memória, zero rede
 *  STALE (< 5min) → devolve memória + revalida em background (só head barato)
 *  COLD           → 1 fetch da lista (topo = stories[0].id)
 */
const WARM_MS = 90_000;
const STALE_MS = 300_000;
const listCache = new Map<
  string,
  { at: number; stories: Story[]; headId: string }
>();
const listInflight = new Map<string, Promise<Story[]>>();
const revalidateInflight = new Map<string, number>();
let listGeneration = 0;

/** Cache de post individual (abrir matéria). */
const POST_TTL = 60_000;
const postCache = new Map<string, { at: number; story: Story }>();

export function invalidateSupabaseList() {
  listGeneration += 1;
  listCache.clear();
  listInflight.clear();
  revalidateInflight.clear();
  postCache.clear();
}

export function dbPostToStory(p: DbPost, fallbackCategory: Category): Story {
  const { source, sourceLabel } = storySourceFromAccount(p.account || "", {
    source: p.source || undefined,
    postUrl: p.post_url || "",
  });
  const title = (
    p.summary_pt ||
    p.translation_pt ||
    p.content ||
    "Sem título"
  ).trim();
  const body = (p.translation_pt || p.content || p.summary_pt || "").trim();
  const original = (p.content || "").trim();
  const id = String(p.post_id || "").trim();
  const url =
    p.post_url && p.post_url.startsWith("http")
      ? p.post_url
      : id.startsWith("yt_")
        ? `https://www.youtube.com/watch?v=${id.replace(/^yt_/, "")}`
        : id
          ? `https://x.com/${source}/status/${id}`
          : "";
  const image =
    p.image_url && p.image_url.startsWith("http") ? p.image_url : null;
  const packed = unpackMediaLabel(p.media_label);
  const meta = packed.meta as {
    quoted?: Story["quoted"];
    replyTo?: Story["replyTo"];
    card?: Story["card"];
    xArticle?: Story["xArticle"];
    assets?: Story["assets"];
  } | null;
  const assets = meta?.assets?.length
    ? meta.assets
    : id.startsWith("yt_")
      ? [
          {
            type: "youtube" as const,
            url,
            poster: image || `https://i.ytimg.com/vi/${id.replace(/^yt_/, "")}/hqdefault.jpg`,
            videoId: id.replace(/^yt_/, ""),
          },
        ]
      : image
        ? [{ type: "photo" as const, url: image }]
        : [];
  return {
    id: id || `${source}-${p.posted_at}`,
    title: title.slice(0, 280),
    excerpt: (body || original || title).slice(0, 320),
    body: body || original,
    original,
    url,
    image,
    assets,
    quoted: meta?.quoted ?? null,
    replyTo: meta?.replyTo ?? null,
    card: meta?.card ?? null,
    xArticle: meta?.xArticle ?? null,
    publishedAt: p.posted_at || new Date().toISOString(),
    source,
    sourceLabel,
    category: normalizeSection(p.category || fallbackCategory),
    media: packed.label || (id.startsWith("yt_") ? "Vídeo" : image ? "Foto" : "Nenhuma"),
    batch: p.batch_name || "supabase",
  };
}

export type ListOpts = {
  before?: string;
  after?: string;
  limit?: number;
  accounts?: string[];
};

function normalizeAccount(value: string): string {
  return String(value || "")
    .replace(/^@+/, "")
    .trim()
    .toLowerCase();
}

/** Topo real — 1 linha. Usado só na revalidação em background. */
async function fetchHeadId(category: Category): Promise<string> {
  const params = new URLSearchParams();
  params.set("select", "post_id");
  params.set("order", "posted_at.desc");
  params.set("limit", "1");
  params.set("category", `eq.${normalizeSection(category)}`);
  const res = await fetch(`${SUPABASE_POSTS_URL}?${params}`, {
    headers: supabaseReadHeaders(),
    signal: AbortSignal.timeout(3_000),
  });
  if (!res.ok) throw new Error(`supabase_${res.status}`);
  const rows = (await res.json()) as unknown;
  if (!Array.isArray(rows)) throw new Error("supabase_head_invalid");
  if (!rows.length) return "";
  const id = (rows[0] as { post_id?: unknown })?.post_id;
  if (typeof id !== "string" || !id.trim())
    throw new Error("supabase_head_invalid");
  return id;
}

async function fetchList(
  category: Category,
  opts: ListOpts = {},
): Promise<Story[]> {
  const params = new URLSearchParams();
  params.set("select", LIST_SELECT);
  params.set("order", "posted_at.desc");
  params.set("limit", String(opts.limit ?? PAGE_SIZE));
  const posted = postedAtQuery(opts);
  if (posted.and) params.set("and", posted.and);
  if (posted.posted_at) params.set("posted_at", posted.posted_at);
  params.set("category", `eq.${normalizeSection(category)}`);
  if (opts.accounts) {
    const filter = accountInFilter(opts.accounts);
    params.set("account", filter ? `in.(${filter})` : "eq.__no_catalog__");
  }

  const res = await fetch(`${SUPABASE_POSTS_URL}?${params}`, {
    headers: supabaseReadHeaders(),
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) throw new Error(`supabase_${res.status}`);
  const rows = (await res.json()) as unknown;
  if (!Array.isArray(rows)) throw new Error("supabase_list_invalid");
  return rows.filter(isNewsRow).map((p) => dbPostToStory(p, category));
}

function storeList(key: string, stories: Story[], headId: string) {
  stories.sort((a, b) =>
    (b.publishedAt || "").localeCompare(a.publishedAt || ""),
  );
  const top = stories[0]?.id || headId || "";
  listCache.set(key, { at: Date.now(), stories, headId: top });
  return stories;
}

/**
 * Revalida só o head. Se mudou → fetch lista completa.
 * Se igual → só renova o timestamp do cache (estende WARM).
 */
function revalidateInBackground(
  slug: Category,
  limit: number,
  key: string,
  knownHead: string,
  accounts?: string[],
) {
  // single-flight por key
  if (revalidateInflight.has(key)) return;
  const generation = listGeneration;
  revalidateInflight.set(key, generation);
  void (async () => {
    try {
      const headId = await fetchHeadId(slug);
      if (generation !== listGeneration) return;
      if (headId === knownHead) {
        // topo igual: estende o warm sem baixar a lista de novo
        const hit = listCache.get(key);
        if (hit) listCache.set(key, { ...hit, at: Date.now() });
        return;
      }
      // topo novo → lista fresca
      const stories = await fetchList(slug, { limit, accounts });
      if (generation === listGeneration) storeList(key, stories, headId);
    } catch {
      /* silent */
    } finally {
      if (revalidateInflight.get(key) === generation)
        revalidateInflight.delete(key);
    }
  })();
}

export async function downloadSupabase(
  fallbackCategory: Category,
  opts: ListOpts = {},
): Promise<Story[]> {
  if (opts.before || opts.after) return fetchList(fallbackCategory, opts);

  const slug = normalizeSection(fallbackCategory);
  const limit = opts.limit ?? PAGE_SIZE;
  const accountKey = opts.accounts
    ? [...new Set(opts.accounts.map(normalizeAccount).filter(Boolean))]
        .sort()
        .join(",")
    : "*";
  const key = `${slug}:${limit}:${accountKey}`;
  const hit = listCache.get(key);
  const age = hit ? Date.now() - hit.at : Number.POSITIVE_INFINITY;

  // 1) Warm: zero rede; the cache key includes the catalog allow-list.
  if (hit && age < WARM_MS) {
    return hit.stories;
  }

  // 2) Stale-while-revalidate: responde na hora, head em background
  if (hit && age < STALE_MS) {
    revalidateInBackground(slug, limit, key, hit.headId, opts.accounts);
    return hit.stories;
  }

  // 3) Cold: 1 request da lista (sem head separado — topo = stories[0])
  const pending = listInflight.get(key);
  if (pending) return pending;

  const generation = listGeneration;
  const job = (async () => {
    const stories = await fetchList(slug, { limit, accounts: opts.accounts });
    if (generation === listGeneration)
      storeList(key, stories, stories[0]?.id || "");
    return stories;
  })().finally(() => {
    if (generation === listGeneration) listInflight.delete(key);
  });

  listInflight.set(key, job);
  return job;
}

export async function downloadPostById(
  id: string,
  fallbackCategory?: Category,
): Promise<Story | null> {
  const clean = id.trim();
  if (!clean) return null;

  const cached = postCache.get(clean);
  if (cached && Date.now() - cached.at < POST_TTL) return cached.story;

  const params = new URLSearchParams();
  params.set("select", FULL_SELECT);
  params.set("post_id", `eq.${clean}`);
  params.set("limit", "1");
  const res = await fetch(`${SUPABASE_POSTS_URL}?${params}`, {
    headers: supabaseReadHeaders(),
    signal: AbortSignal.timeout(6_000),
  });
  if (!res.ok) throw new Error(`supabase_${res.status}`);
  const rows = (await res.json()) as DbPost[];
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row?.post_id || !isNewsRow(row)) return null;
  const cat = row.category || fallbackCategory;
  if (!cat) return null;
  const story = dbPostToStory(row, cat);
  postCache.set(clean, { at: Date.now(), story });
  return story;
}
