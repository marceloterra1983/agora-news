function env(name: string): string {
  if (typeof process === "undefined" || !process.env) return "";
  return process.env[name] ?? "";
}

/** Fonte canônica do feed — tabela public.posts (anon, só leitura). */
export const SUPABASE_URL =
  env("SUPABASE_URL") || env("VITE_SUPABASE_URL") || "https://uqcaodtgrkphuhdkchyh.supabase.co";

export const SUPABASE_ANON_KEY =
  env("SUPABASE_ANON_KEY") ||
  env("VITE_SUPABASE_ANON_KEY") ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxY2FvZHRncmtwaHVoZGtjaHloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3MjQ2NjksImV4cCI6MjEwMjMwMDY2OX0.95RVq-3SbT8KpQn8u-cH7lr4LWJvSOTcn5IQxmLhFt8";

export const SUPABASE_POSTS_URL = `${SUPABASE_URL}/rest/v1/posts`;

import { PAGE_SIZE } from "./page-size.mjs";
import { profilesFor } from "./profiles";
import { catalogFor, scopeCachedStories } from "./section-catalog.mjs";
import { unpackMediaLabel } from "./story-media-meta.mjs";
import { normalizeSection, type Category, type Story } from "./types";
import { CACHE_KEYS, cacheDel, cacheGetJson, cacheSetJson, invalidateNewsCache } from "./cache";

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
};

/** Lista do feed: sem content/translation pesados — só o que a card precisa. */
const LIST_SELECT =
  "post_id,account,posted_at,summary_pt,translation_pt,post_url,media_label,image_url,category,batch_name";
const FULL_SELECT =
  "post_id,account,posted_at,posted_at_sp,content,translation_pt,summary_pt,post_url,media_label,image_url,category,batch_name";

const AUTH = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  Accept: "application/json",
  Prefer: "count=none",
};

/**
 * Camadas de cache da lista:
 *  WARM  (< 90s)  → devolve memória, zero rede
 *  STALE (< 5min) → devolve memória + revalida em background (só head barato)
 *  COLD           → 1 fetch da lista (topo = stories[0].id)
 */
const WARM_MS = 90_000;
const STALE_MS = 300_000;
const listCache = new Map<string, { at: number; stories: Story[]; headId: string }>();
const listInflight = new Map<string, Promise<Story[]>>();
const revalidateInflight = new Set<string>();

/** Cache de post individual (abrir matéria). */
const POST_TTL = 60_000;
const postCache = new Map<string, { at: number; story: Story }>();

export function invalidateSupabaseList() {
  listCache.clear();
  listInflight.clear();
  revalidateInflight.clear();
  postCache.clear();
  void invalidateNewsCache();
}

function handle(raw: string): { source: string; sourceLabel: string } {
  const cleaned = raw.replace(/^@+/, "").trim() || "fonte";
  return { source: cleaned, sourceLabel: `@${cleaned}` };
}

function isNewsRow(p: DbPost): boolean {
  if (!p.post_id) return false;
  if (p.category === "profile" || p.category === "watch" || p.category === "lock") return false;
  if (p.category === "cache" || p.category === "push" || p.category === "prefs") return false;
  if (p.batch_name === "x-profile" || p.batch_name === "x-watch" || p.batch_name === "cache")
    return false;
  if (/^(prfl_|watch_|lock_|kv_|push_)/i.test(p.post_id)) return false;
  if (p.account === "cache") return false;
  return true;
}

export function storiesFromDbPosts(
  rows: Array<Partial<DbPost> & { post_id: string; posted_at: string }>,
  fallbackCategory?: Category,
): Story[] {
  return rows.flatMap((p) => {
    const cat = p.category || fallbackCategory;
    if (!cat) return [];
    return [
      dbPostToStory(
        {
          post_id: p.post_id,
          account: p.account ?? null,
          posted_at: p.posted_at,
          posted_at_sp: p.posted_at_sp ?? null,
          content: p.content ?? null,
          translation_pt: p.translation_pt ?? null,
          summary_pt: p.summary_pt ?? null,
          post_url: p.post_url ?? null,
          media_label: p.media_label ?? null,
          image_url: p.image_url ?? null,
          category: p.category ?? cat,
          batch_name: p.batch_name ?? null,
        },
        cat,
      ),
    ];
  });
}

export function dbPostToStory(p: DbPost, fallbackCategory: Category): Story {
  const { source, sourceLabel } = handle(p.account || "");
  const title = (p.summary_pt || p.translation_pt || p.content || "Sem título").trim();
  const body = (p.translation_pt || p.content || p.summary_pt || "").trim();
  const original = (p.content || "").trim();
  const id = String(p.post_id || "").trim();
  const url =
    p.post_url && p.post_url.startsWith("http")
      ? p.post_url
      : id
        ? `https://x.com/${source}/status/${id}`
        : "";
  const image = p.image_url && p.image_url.startsWith("http") ? p.image_url : null;
  const packed = unpackMediaLabel(p.media_label);
  const meta = packed.meta as {
    quoted?: Story["quoted"];
    replyTo?: Story["replyTo"];
    card?: Story["card"];
    xArticle?: Story["xArticle"];
    assets?: Story["assets"];
  } | null;
  const assets =
    meta?.assets?.length
      ? meta.assets
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
    media: packed.label || (image ? "Foto" : "Nenhuma"),
    batch: p.batch_name || "supabase",
  };
}

export type ListOpts = { before?: string; limit?: number; accounts?: string[] };

function normAccount(raw: string): string {
  return String(raw || "")
    .replace(/^@+/, "")
    .trim()
    .toLowerCase();
}

async function accountsFor(category: Category): Promise<string[]> {
  try {
    const { listWatchAccounts } = await import("./watch");
    const extras = await listWatchAccounts();
    return catalogFor(category, { profiles: profilesFor(category), extras }).handles;
  } catch {
    return catalogFor(category, { profiles: profilesFor(category) }).handles;
  }
}

async function fetchListRows(category: Category, opts: ListOpts = {}): Promise<DbPost[]> {
  const params = new URLSearchParams();
  params.set("select", LIST_SELECT);
  params.set("order", "posted_at.desc");
  params.set("limit", String(opts.limit ?? PAGE_SIZE));
  if (opts.before) params.set("posted_at", `lt.${opts.before}`);
  params.set("category", `eq.${normalizeSection(category)}`);

  const res = await fetch(`${SUPABASE_POSTS_URL}?${params}`, {
    headers: AUTH,
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) throw new Error(`supabase_${res.status}`);
  const rows = (await res.json()) as DbPost[];
  return Array.isArray(rows) ? rows : [];
}

/** Topo real do catálogo — pula vazamento category=ai de conta fora da seção. */
async function fetchHeadId(category: Category, allowed: Set<string>): Promise<string | null> {
  try {
    const rows = await fetchListRows(category, { limit: 24 });
    const hit = rows.find((p) => isNewsRow(p) && allowed.has(normAccount(p.account || "")));
    return hit?.post_id ? String(hit.post_id) : null;
  } catch {
    return null;
  }
}

async function fetchList(category: Category, opts: ListOpts = {}): Promise<Story[]> {
  const want = opts.limit ?? PAGE_SIZE;
  const allowed = new Set((opts.accounts ?? (await accountsFor(category))).map(normAccount));
  const out: Story[] = [];
  let before = opts.before;
  for (let i = 0; i < 5 && out.length < want; i++) {
    const batchSize = Math.min(80, Math.max(want * 2, 40));
    const rows = await fetchListRows(category, { before, limit: batchSize });
    if (!rows.length) break;
    for (const p of rows) {
      if (!isNewsRow(p) || !allowed.has(normAccount(p.account || ""))) continue;
      out.push(dbPostToStory(p, category));
      if (out.length >= want) break;
    }
    before = rows[rows.length - 1]?.posted_at || before;
    if (rows.length < batchSize) break;
  }
  return out;
}

function storeList(key: string, stories: Story[], headId: string) {
  stories.sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));
  const top = stories[0]?.id || headId || "";
  listCache.set(key, { at: Date.now(), stories, headId: top });
  return stories;
}

async function allowCatalog(slug: Category, accounts?: string[]) {
  return { handles: (accounts ?? (await accountsFor(slug))).map(normAccount) };
}

/** Snapshot Redis/memória: reaplicar allow-list — um payload pré-fix não pode ressuscitar handle. */
async function scopedCachedList(
  stories: Story[] | null | undefined,
  slug: Category,
  accounts?: string[],
): Promise<Story[]> {
  return scopeCachedStories(stories ?? [], await allowCatalog(slug, accounts));
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
  revalidateInflight.add(key);
  void (async () => {
    try {
      const allowed = new Set((accounts ?? (await accountsFor(slug))).map(normAccount));
      const headId = await fetchHeadId(slug, allowed);
      if (!headId) return;
      if (headId === knownHead) {
        // topo igual: estende o warm sem baixar a lista de novo
        const hit = listCache.get(key);
        if (hit) listCache.set(key, { ...hit, at: Date.now() });
        return;
      }
      // topo novo → lista fresca
      const stories = await fetchList(slug, { limit, accounts: accounts ?? [...allowed] });
      if (stories.length) {
        storeList(key, stories, headId);
        void cacheSetJson(CACHE_KEYS.list(slug, limit), stories, 120);
      }
    } catch {
      /* silent */
    } finally {
      revalidateInflight.delete(key);
    }
  })();
}

export async function downloadSupabase(
  fallbackCategory: Category,
  opts: ListOpts = {},
): Promise<Story[]> {
  if (opts.before) return fetchList(fallbackCategory, opts);

  const slug = normalizeSection(fallbackCategory);
  const limit = opts.limit ?? PAGE_SIZE;
  const key = `${slug}:${limit}`;
  const redisKey = CACHE_KEYS.list(slug, limit);
  const hit = listCache.get(key);
  const age = hit ? Date.now() - hit.at : Number.POSITIVE_INFINITY;

  // 1) Warm: zero rede — mas o snapshot pode ser pré-fix (handle fora do catálogo)
  if (hit && age < WARM_MS) {
    const scoped = await scopedCachedList(hit.stories, slug, opts.accounts);
    if (scoped.length !== hit.stories.length) {
      storeList(key, scoped, scoped[0]?.id || hit.headId);
      void cacheSetJson(redisKey, scoped, 120);
    }
    return scoped;
  }

  // 2) Stale-while-revalidate: responde na hora, head em background
  if (hit && age < STALE_MS) {
    revalidateInBackground(slug, limit, key, hit.headId, opts.accounts);
    const scoped = await scopedCachedList(hit.stories, slug, opts.accounts);
    if (scoped.length !== hit.stories.length) {
      storeList(key, scoped, scoped[0]?.id || hit.headId);
      void cacheSetJson(redisKey, scoped, 120);
    }
    return scoped;
  }

  // 3) Cold: 1 request da lista (sem head separado — topo = stories[0])
  const pending = listInflight.get(key);
  if (pending) return pending;

  const job = (async () => {
    // memória de processo anterior no mesmo isolate (cloud KV) — sem bloquear se demorar
    const remotePromise = cacheGetJson<Story[]>(redisKey).catch(() => null);

    const stories = await fetchList(slug, { limit });
    if (stories.length) {
      const top = stories[0]?.id || "";
      storeList(key, stories, top);
      void cacheSetJson(redisKey, stories, 120);
      return stories;
    }

    // fallback: cloud KV se lista vazia (ex.: falha intermitente)
    const remote = await remotePromise;
    const scoped = await scopedCachedList(remote, slug, opts.accounts);
    if (scoped.length) {
      return storeList(key, scoped, scoped[0]?.id || "");
    }
    return stories;
  })().finally(() => listInflight.delete(key));

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
    headers: AUTH,
    signal: AbortSignal.timeout(6_000),
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as DbPost[];
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row?.post_id || !isNewsRow(row)) return null;
  const cat = row.category || fallbackCategory;
  if (!cat) return null;
  const story = dbPostToStory(row, cat);
  postCache.set(clean, { at: Date.now(), story });
  return story;
}

export async function probeSupabase(): Promise<{
  ok: boolean;
  items: number;
  newest?: string;
  error?: string;
}> {
  try {
    const stories = await downloadSupabase("ai");
    return {
      ok: stories.length > 0,
      items: stories.length,
      newest: stories[0]?.publishedAt,
    };
  } catch (err) {
    return {
      ok: false,
      items: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
