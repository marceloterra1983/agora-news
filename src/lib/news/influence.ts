import { profilesFor, type XProfile } from "./profiles";
import { loadFeed } from "./feed";
import { listStoredProfiles } from "./profile-store";
import { listWatchAccounts } from "./watch";
import type { Category, Story } from "./types";

export type InfluenceRow = {
  handle: string;
  name: string;
  group: XProfile["group"];
  followers: number;
  following: number;
  tweets: number;
  verified: boolean;
  avatar: string | null;
  bio: string | null;
  lastPost: { id: string; title: string; publishedAt: string } | null;
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

const USER_TTL = 60 * 60_000;
const userCache = new Map<string, { at: number; stats: LiveStats }>();

function emptyStats(): LiveStats {
  return { followers: 0, following: 0, tweets: 0, verified: false, avatar: null, bio: null };
}

function seedFromStore(
  handle: string,
  row: { followers?: number; avatar?: string | null; bio?: string; summary_pt?: string; name?: string },
) {
  const key = handle.toLowerCase();
  if (userCache.has(key)) return;
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
  const key = handle.toLowerCase();
  const hit = userCache.get(key);
  if (hit && Date.now() - hit.at < USER_TTL && (hit.stats.followers || hit.stats.avatar)) {
    return hit.stats;
  }
  try {
    const res = await fetch(`https://api.fxtwitter.com/${encodeURIComponent(handle)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(4_000),
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

function recencySort(a: InfluenceRow, b: InfluenceRow): number {
  const ta = a.lastPost ? Date.parse(a.lastPost.publishedAt) : 0;
  const tb = b.lastPost ? Date.parse(b.lastPost.publishedAt) : 0;
  return tb - ta || b.score - a.score || b.followers - a.followers;
}

function cachedStats(handle: string): LiveStats {
  return userCache.get(handle.toLowerCase())?.stats ?? emptyStats();
}

export function rowsFromStories(section: Category, stories: Story[]): InfluenceRow[] {
  const since = Date.now() - 48 * 60 * 60_000;
  const allByHandle = new Map<string, Story[]>();
  for (const story of stories) {
    const key = story.source.toLowerCase();
    const list = allByHandle.get(key) ?? [];
    list.push(story);
    allByHandle.set(key, list);
  }
  for (const list of allByHandle.values()) {
    list.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  }

  return profilesFor(section)
    .map((p) => {
      const key = p.handle.toLowerCase();
      const stats = cachedStats(key);
      const posts = allByHandle.get(key) ?? [];
      const last = posts[0];
      const recentCount = posts.filter((s) => Date.parse(s.publishedAt) >= since).length;
      const longform = posts.filter((s) =>
        /\/i\/article\//i.test(`${s.url} ${s.original} ${s.body}`),
      ).length;
      return {
        handle: p.handle,
        name: p.name,
        group: p.group,
        ...stats,
        lastPost: last
          ? { id: last.id, title: last.title, publishedAt: last.publishedAt }
          : null,
        inFeed: recentCount,
        articles: posts.length,
        longform,
        likes: 0,
        engagement: 0,
        views: 0,
        er: 0,
        score: scoreOf(stats, recentCount),
      };
    })
    .sort(recencySort);
}

function extraRows(
  watch: Array<{ handle: string; name: string; avatar: string | null; summary: string; followers: number }>,
  stories: Story[],
  already: Set<string>,
): InfluenceRow[] {
  const since = Date.now() - 48 * 60 * 60_000;
  const out: InfluenceRow[] = [];
  for (const w of watch) {
    const key = w.handle.toLowerCase();
    if (already.has(key)) continue;
    const posts = stories.filter((s) => s.source.toLowerCase() === key);
    posts.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    const last = posts[0];
    const stats = cachedStats(key);
    out.push({
      handle: w.handle,
      name: w.name || w.handle,
      group: "novos",
      followers: stats.followers || w.followers,
      following: 0,
      tweets: 0,
      verified: false,
      avatar: stats.avatar || w.avatar,
      bio: stats.bio || w.summary || null,
      lastPost: last ? { id: last.id, title: last.title, publishedAt: last.publishedAt } : null,
      inFeed: posts.filter((s) => Date.parse(s.publishedAt) >= since).length,
      articles: posts.length,
      longform: 0,
      likes: 0,
      engagement: 0,
      views: 0,
      er: 0,
      score: scoreOf(stats, posts.length),
    });
  }
  return out;
}

async function hydrateStore() {
  const [stored, watch] = await Promise.all([listStoredProfiles(), listWatchAccounts()]);
  for (const row of stored) seedFromStore(row.handle, row);
  for (const row of watch) seedFromStore(row.handle, row);
  return watch;
}

/** Lista imediata: feed + cache do banco. Sem rede extra no X. */
export async function loadFontesFast(section: Category): Promise<InfluenceRow[]> {
  const [feed, watch] = await Promise.all([loadFeed(false, section, false), hydrateStore()]);
  const base = rowsFromStories(section, feed.stories);
  const seen = new Set(base.map((r) => r.handle.toLowerCase()));
  return [...extraRows(watch, feed.stories, seen), ...base].sort(recencySort);
}

/** Completa só o que ainda não tem avatar/seguidores. */
export async function enrichFontes(section: Category): Promise<InfluenceRow[]> {
  const profiles = profilesFor(section);
  const missing = profiles.filter((p) => {
    const hit = userCache.get(p.handle.toLowerCase());
    return !hit || Date.now() - hit.at >= USER_TTL || (!hit.stats.followers && !hit.stats.avatar);
  });
  if (missing.length) {
    await mapPool(missing.slice(0, 16), 8, (p) => fetchOne(p.handle));
  }
  return loadFontesFast(section);
}

export async function loadInfluence(section: Category): Promise<InfluenceRow[]> {
  return loadFontesFast(section);
}
