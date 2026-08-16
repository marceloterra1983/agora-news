import { buzzFor, buzzIsFresh, fetchLastBuzz } from "./fonte-metrics";
import { lastPostHref, preferNewerLast, storedToLastHit } from "./last-post";
import { listXLastPosts } from "./last-post-store";
import { profilesFor, type XProfile } from "./profiles";
import { listStoredProfiles, type StoredProfile } from "./profile-store";
import { listWatchAccounts } from "./watch";
import { SUPABASE_ANON_KEY, SUPABASE_POSTS_URL } from "./supabase";
import type { Category } from "./types";

export type InfluenceRow = {
  handle: string;
  name: string;
  group: XProfile["group"] | string;
  followers: number;
  following: number;
  tweets: number;
  verified: boolean;
  avatar: string | null;
  bio: string | null;
  lastPost: {
    id: string;
    href: string;
    title: string;
    publishedAt: string;
    likes?: number;
    views?: number;
    replies?: number;
    reposts?: number;
    quotes?: number;
    bookmarks?: number;
    er?: number;
  } | null;
  inFeed: number;
  articles: number;
  longform: number;
  likes: number;
  engagement: number;
  views: number;
  er: number;
  score: number;
};

type LiveStats = {
  followers: number;
  following: number;
  tweets: number;
  verified: boolean;
  avatar: string | null;
  bio: string | null;
};

type LastHit = { id: string; title: string; publishedAt: string; count: number };

const USER_TTL = 60 * 60_000;
const userCache = new Map<string, { at: number; stats: LiveStats }>();
const lastCache = new Map<string, { at: number; map: Map<string, LastHit> }>();
const LAST_TTL = 45_000;

const AUTH = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  Accept: "application/json",
};

function norm(h: string): string {
  return String(h || "")
    .replace(/^@+/, "")
    .trim();
}

function emptyStats(): LiveStats {
  return { followers: 0, following: 0, tweets: 0, verified: false, avatar: null, bio: null };
}

function seedFromStore(
  handle: string,
  row: { followers?: number; avatar?: string | null; bio?: string; summary_pt?: string },
) {
  const key = norm(handle).toLowerCase();
  if (!key || userCache.has(key)) return;
  userCache.set(key, {
    at: Date.now(),
    stats: {
      followers: Number(row.followers) || 0,
      following: 0,
      tweets: 0,
      verified: false,
      avatar: row.avatar || null,
      bio: row.bio || row.summary_pt || null,
    },
  });
}

async function fetchOne(handle: string): Promise<LiveStats> {
  const key = norm(handle).toLowerCase();
  const hit = userCache.get(key);
  if (hit && Date.now() - hit.at < USER_TTL && (hit.stats.followers || hit.stats.avatar)) {
    return hit.stats;
  }
  try {
    const res = await fetch(`https://api.fxtwitter.com/${encodeURIComponent(norm(handle))}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3_500),
    });
    if (!res.ok) return hit?.stats ?? emptyStats();
    const body = (await res.json()) as {
      user?: {
        followers?: number;
        following?: number;
        tweets?: number;
        avatar_url?: string;
        description?: string;
        verification?: { verified?: boolean };
      };
    };
    const user = body.user;
    if (!user) return hit?.stats ?? emptyStats();
    const stats: LiveStats = {
      followers: Number(user.followers) || 0,
      following: Number(user.following) || 0,
      tweets: Number(user.tweets) || 0,
      verified: Boolean(user.verification?.verified),
      avatar: user.avatar_url ?? null,
      bio: user.description?.trim() || null,
    };
    userCache.set(key, { at: Date.now(), stats });
    return stats;
  } catch {
    return hit?.stats ?? emptyStats();
  }
}

async function mapPool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return out;
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(".", ",")} mi`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace(".", ",")} mil`;
  return String(n);
}

export function formatRate(pct: number): string {
  if (!pct) return "—";
  if (pct >= 10) return `${pct.toFixed(0)}%`;
  if (pct >= 1) return `${pct.toFixed(1).replace(".", ",")}%`;
  return `${pct.toFixed(2).replace(".", ",")}%`;
}

function scoreOf(stats: LiveStats, inFeed: number): number {
  const reach = Math.log10(stats.followers + 1);
  return reach * 28 + Math.min(inFeed, 24) * 5 + (stats.verified ? 3 : 0);
}

function lastWithBuzz(last: LastHit | null, handle: string, inApp: boolean): InfluenceRow["lastPost"] {
  if (!last) return null;
  return {
    id: last.id,
    href: lastPostHref(handle, last.id, inApp),
    title: last.title,
    publishedAt: last.publishedAt,
    ...(buzzFor(handle) ?? {}),
  };
}

function recencySort(a: InfluenceRow, b: InfluenceRow): number {
  const ta = a.lastPost ? Date.parse(a.lastPost.publishedAt) : 0;
  const tb = b.lastPost ? Date.parse(b.lastPost.publishedAt) : 0;
  return tb - ta || b.score - a.score || b.followers - a.followers;
}

function cachedStats(handle: string): LiveStats {
  return userCache.get(norm(handle).toLowerCase())?.stats ?? emptyStats();
}

/** 1 query leve: últimos posts por conta na categoria (sem montar Story completo). */
async function lastPostsByAccount(section: Category): Promise<Map<string, LastHit>> {
  const key = section;
  const hit = lastCache.get(key);
  if (hit && Date.now() - hit.at < LAST_TTL) return hit.map;

  const map = new Map<string, LastHit>();
  try {
    const params = new URLSearchParams();
    params.set("select", "post_id,account,posted_at,summary_pt");
    params.set("category", `eq.${section}`);
    params.set("order", "posted_at.desc");
    params.set("limit", "1000");
    const res = await fetch(`${SUPABASE_POSTS_URL}?${params}`, {
      headers: AUTH,
      signal: AbortSignal.timeout(5_000),
    });
    if (res.ok) {
      const rows = (await res.json()) as Array<{
        post_id?: string;
        account?: string;
        posted_at?: string;
        summary_pt?: string;
      }>;
      for (const row of rows) {
        const handle = norm(row.account || "").toLowerCase();
        if (!handle || !row.post_id) continue;
        const prev = map.get(handle);
        if (prev) {
          prev.count += 1;
          continue;
        }
        map.set(handle, {
          id: String(row.post_id),
          title: String(row.summary_pt || "Sem título").slice(0, 180),
          publishedAt: String(row.posted_at || ""),
          count: 1,
        });
      }
    }
  } catch {
    /* empty map */
  }
  const storedLast = await listXLastPosts();
  for (const [handle, post] of storedLast) {
    const hit = storedToLastHit(post);
    if (!hit) continue;
    const cur = map.get(handle) ?? null;
    const next = preferNewerLast(cur, hit);
    if (next) map.set(handle, next);
  }
  lastCache.set(key, { at: Date.now(), map });
  return map;
}

async function hydrateStore() {
  const [stored, watch] = await Promise.all([listStoredProfiles(), listWatchAccounts()]);
  for (const row of stored) seedFromStore(row.handle, row);
  for (const row of watch) seedFromStore(row.handle, row);
  return { stored, watch };
}

function storedLastMap(stored: StoredProfile[]): Map<string, LastHit> {
  const map = new Map<string, LastHit>();
  for (const row of stored) {
    const hit = storedToLastHit(row.last_post);
    if (hit) map.set(norm(row.handle).toLowerCase(), hit);
  }
  return map;
}

function buildRows(
  section: Category,
  lastMap: Map<string, LastHit>,
  stored: StoredProfile[],
  watch: Array<{ handle: string; name: string; avatar: string | null; summary: string; followers: number }>,
): InfluenceRow[] {
  const since = Date.now() - 48 * 60 * 60_000;
  const fromStore = storedLastMap(stored);
  const base = profilesFor(section).map((p) => {
    const key = norm(p.handle).toLowerCase();
    const stats = cachedStats(key);
    const fromFeed = lastMap.get(key) ?? null;
    const last = preferNewerLast(fromFeed, fromStore.get(key) ?? null);
    const inApp = Boolean(fromFeed && last && fromFeed.id === last.id);
    const recentCount =
      last && Date.parse(last.publishedAt) >= since ? last.count : last ? Math.min(last.count, 1) : 0;
    return {
      handle: p.handle,
      name: p.name,
      group: p.group,
      ...stats,
      lastPost: lastWithBuzz(last, p.handle, inApp),
      inFeed: recentCount,
      articles: last?.count ?? 0,
      longform: 0,
      likes: 0,
      engagement: 0,
      views: 0,
      er: buzzFor(p.handle)?.profileEr ?? 0,
      score: scoreOf(stats, recentCount),
    } satisfies InfluenceRow;
  });

  const seen = new Set(base.map((r) => norm(r.handle).toLowerCase()));
  const extras: InfluenceRow[] = [];
  for (const w of watch) {
    const key = norm(w.handle).toLowerCase();
    if (!key || seen.has(key)) continue;
    const stats = cachedStats(key);
    const fromFeed = lastMap.get(key) ?? null;
    const last = preferNewerLast(fromFeed, fromStore.get(key) ?? null);
    const inApp = Boolean(fromFeed && last && fromFeed.id === last.id);
    extras.push({
      handle: w.handle,
      name: w.name || w.handle,
      group: "novos",
      followers: stats.followers || w.followers,
      following: 0,
      tweets: 0,
      verified: false,
      avatar: stats.avatar || w.avatar,
      bio: stats.bio || w.summary || null,
      lastPost: lastWithBuzz(last, w.handle, inApp),
      inFeed: last?.count ?? 0,
      articles: last?.count ?? 0,
      longform: 0,
      likes: 0,
      engagement: 0,
      views: 0,
      er: buzzFor(w.handle)?.profileEr ?? 0,
      score: scoreOf(stats, last?.count ?? 0),
    });
  }
  return [...extras, ...base].sort(recencySort);
}

/** Lista imediata: 1 query posts leve + cache de perfis. Zero fxtwitter. */
export async function loadFontesFast(section: Category): Promise<InfluenceRow[]> {
  const [lastMap, { stored, watch }] = await Promise.all([lastPostsByAccount(section), hydrateStore()]);
  return buildRows(section, lastMap, stored, watch);
}

/** Completa só o que ainda não tem avatar/seguidores (máx 8, pool 6). */
export async function enrichFontes(section: Category): Promise<InfluenceRow[]> {
  const profiles = profilesFor(section);
  const missing = profiles.filter((p) => {
    const hit = userCache.get(norm(p.handle).toLowerCase());
    return !hit || Date.now() - hit.at >= USER_TTL || (!hit.stats.followers && !hit.stats.avatar);
  });
  if (missing.length) {
    await mapPool(missing.slice(0, 8), 6, (p) => fetchOne(p.handle));
  }
  let rows = await loadFontesFast(section);
  const needBuzz = rows.filter((r) => r.lastPost && !buzzIsFresh(r.handle)).slice(0, 20);
  if (needBuzz.length) {
    await mapPool(needBuzz, 8, (r) => fetchLastBuzz(r.handle));
    rows = await loadFontesFast(section);
  }
  return rows;
}

export async function loadInfluence(section: Category): Promise<InfluenceRow[]> {
  return loadFontesFast(section);
}

/** Invalida cache de last-posts (chamar após ingest). */
export function invalidateFontesLastCache() {
  lastCache.clear();
}
