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

/** Cache local curto — o topo é sempre validado no banco. */
const LIST_TTL = 20_000;
const listCache = new Map<string, { at: number; stories: Story[]; headId: string }>();
const listInflight = new Map<string, Promise<Story[]>>();

export function invalidateSupabaseList() {
  listCache.clear();
  listInflight.clear();
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

export function dbPostToStory(p: DbPost, fallbackCategory: Category): Story {
  const { source, sourceLabel } = handle(p.account || "");
  const title = (p.summary_pt || p.translation_pt || p.content || "Sem título").trim();
  const body = (p.translation_pt || p.content || "").trim();
  const original = (p.content || "").trim();
  const id = String(p.post_id || "").trim();
  const url =
    p.post_url && p.post_url.startsWith("http")
      ? p.post_url
      : id
        ? `https://x.com/${source}/status/${id}`
        : "";
  const image = p.image_url && p.image_url.startsWith("http") ? p.image_url : null;
  return {
    id: id || `${source}-${p.posted_at}`,
    title: title.slice(0, 280),
    excerpt: (body || original || title).slice(0, 320),
    body: body || original,
    original,
    url,
    image,
    assets: image ? [{ type: "photo" as const, url: image }] : [],
    publishedAt: p.posted_at || new Date().toISOString(),
    source,
    sourceLabel,
    category: normalizeSection(p.category || fallbackCategory),
    media: p.media_label || (image ? "Foto" : "Nenhuma"),
    batch: p.batch_name || "supabase",
  };
}

export type ListOpts = { before?: string; limit?: number };

/** Topo real da tabela — 1 linha, barato. */
async function fetchHeadId(category: Category): Promise<string | null> {
  try {
    const params = new URLSearchParams();
    params.set("select", "post_id");
    params.set("order", "posted_at.desc");
    params.set("limit", "1");
    params.set("category", `eq.${normalizeSection(category)}`);
    const res = await fetch(`${SUPABASE_POSTS_URL}?${params}`, {
      headers: AUTH,
      signal: AbortSignal.timeout(4_000),
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ post_id?: string }>;
    return rows[0]?.post_id ? String(rows[0].post_id) : null;
  } catch {
    return null;
  }
}

async function fetchList(category: Category, opts: ListOpts = {}): Promise<Story[]> {
  const params = new URLSearchParams();
  params.set("select", LIST_SELECT);
  params.set("order", "posted_at.desc");
  params.set("limit", String(opts.limit ?? 40));
  if (opts.before) params.set("posted_at", `lt.${opts.before}`);
  // Só a categoria pedida — evita misturar null/cache e perder o topo real
  params.set("category", `eq.${normalizeSection(category)}`);

  const res = await fetch(`${SUPABASE_POSTS_URL}?${params}`, {
    headers: AUTH,
    signal: AbortSignal.timeout(6_000),
  });
  if (!res.ok) throw new Error(`supabase_${res.status}`);
  const rows = (await res.json()) as DbPost[];
  if (!Array.isArray(rows)) return [];
  return rows.filter(isNewsRow).map((p) => dbPostToStory(p, category));
}

export async function downloadSupabase(
  fallbackCategory: Category,
  opts: ListOpts = {},
): Promise<Story[]> {
  if (opts.before) return fetchList(fallbackCategory, opts);

  const slug = normalizeSection(fallbackCategory);
  const limit = opts.limit ?? 40;
  const key = `${slug}:${limit}`;
  const redisKey = CACHE_KEYS.list(slug, limit);

  // 1) topo real no banco (sempre)
  const headId = await fetchHeadId(slug);

  // 2) memória local — só se o topo bater
  const hit = listCache.get(key);
  if (hit && Date.now() - hit.at < LIST_TTL && (!headId || hit.headId === headId)) {
    return hit.stories;
  }

  // 3) Redis/cloud — só se o topo bater; senão descarta (era isso que travava em 8h)
  const remote = await cacheGetJson<Story[]>(redisKey);
  if (remote?.length) {
    const remoteHead = remote[0]?.id || "";
    if (headId && remoteHead === headId) {
      listCache.set(key, { at: Date.now(), stories: remote, headId });
      return remote;
    }
    // cache envenenado / defasado → apaga
    void cacheDel(redisKey);
  }

  const pending = listInflight.get(key);
  if (pending) return pending;

  const job = fetchList(fallbackCategory, opts)
    .then((stories) => {
      // garante ordem por data
      stories.sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));
      const top = stories[0]?.id || headId || "";
      listCache.set(key, { at: Date.now(), stories, headId: top });
      if (stories.length) void cacheSetJson(redisKey, stories, 30);
      return stories;
    })
    .finally(() => listInflight.delete(key));
  listInflight.set(key, job);
  return job;
}

export async function downloadPostById(
  id: string,
  fallbackCategory: Category = "ai",
): Promise<Story | null> {
  const clean = id.trim();
  if (!clean) return null;
  const params = new URLSearchParams();
  params.set("select", FULL_SELECT);
  params.set("post_id", `eq.${clean}`);
  params.set("limit", "1");
  const res = await fetch(`${SUPABASE_POSTS_URL}?${params}`, {
    headers: AUTH,
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as DbPost[];
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row?.post_id || !isNewsRow(row)) return null;
  return dbPostToStory(row, fallbackCategory);
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
