import { hydrateBuzzCache } from "./fonte-buzz-store";
import { buzzFor, buzzIsFresh, fetchLastBuzz } from "./fonte-metrics";
import { lastPostHref, preferNewerLast, storedToLastHit } from "./last-post";
import { lastPostsByAccount, type LastHit } from "./fontes-last";
import { mapPool } from "./map-pool";
import { profilesFor, type XProfile } from "./profiles";
import { listStoredProfiles, type StoredProfile } from "./profile-store";
import { listKnownSections } from "./sections";
import type { Category } from "./types";

export type InfluenceRow = {
  handle: string;
  name: string;
  group: XProfile["group"] | string;
  followers: number;
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
};

type LiveStats = {
  followers: number;
  verified: boolean;
  avatar: string | null;
  bio: string | null;
};

const USER_TTL = 60 * 60_000;
const userCache = new Map<string, { at: number; stats: LiveStats }>();

function norm(h: string): string {
  return String(h || "")
    .replace(/^@+/, "")
    .trim();
}

function emptyStats(): LiveStats {
  return { followers: 0, verified: false, avatar: null, bio: null };
}

function seedFromStore(
  handle: string,
  row: {
    followers?: number;
    avatar?: string | null;
    bio?: string;
    summary_pt?: string;
  },
) {
  const key = norm(handle).toLowerCase();
  if (!key || userCache.has(key)) return;
  userCache.set(key, {
    at: Date.now(),
    stats: {
      followers: Number(row.followers) || 0,
      verified: false,
      avatar: row.avatar || null,
      bio: row.bio || row.summary_pt || null,
    },
  });
}

async function fetchOne(handle: string): Promise<LiveStats> {
  const key = norm(handle).toLowerCase();
  const hit = userCache.get(key);
  if (
    hit &&
    Date.now() - hit.at < USER_TTL &&
    (hit.stats.followers || hit.stats.avatar)
  ) {
    return hit.stats;
  }
  try {
    const res = await fetch(
      `https://api.fxtwitter.com/${encodeURIComponent(norm(handle))}`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(3_500),
      },
    );
    if (!res.ok) return hit?.stats ?? emptyStats();
    const body = (await res.json()) as {
      user?: {
        followers?: number;
        avatar_url?: string;
        description?: string;
        verification?: { verified?: boolean };
      };
    };
    const user = body.user;
    if (!user) return hit?.stats ?? emptyStats();
    const stats: LiveStats = {
      followers: Number(user.followers) || 0,
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

function lastWithBuzz(
  last: LastHit | null,
  handle: string,
  inApp: boolean,
): InfluenceRow["lastPost"] {
  if (!last) return null;
  return {
    id: last.id,
    href: lastPostHref(handle, last.id, inApp),
    title: last.title,
    publishedAt: last.publishedAt,
    ...(buzzFor(handle, last.id) ?? buzzFor(handle) ?? {}),
  };
}

function recencySort(a: InfluenceRow, b: InfluenceRow): number {
  const ta = a.lastPost ? Date.parse(a.lastPost.publishedAt) : 0;
  const tb = b.lastPost ? Date.parse(b.lastPost.publishedAt) : 0;
  return tb - ta || b.followers - a.followers;
}

function cachedStats(handle: string): LiveStats {
  return userCache.get(norm(handle).toLowerCase())?.stats ?? emptyStats();
}

async function hydrateStore() {
  await hydrateBuzzCache();
  const stored = await listStoredProfiles();
  for (const row of stored) seedFromStore(row.handle, row);
  return stored;
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
  feedMap: Map<string, LastHit>,
  lastMap: Map<string, LastHit>,
  stored: StoredProfile[],
): InfluenceRow[] {
  const since = Date.now() - 48 * 60 * 60_000;
  const fromStore = storedLastMap(stored);
  const base = profilesFor(section).map((p) => {
    const key = norm(p.handle).toLowerCase();
    const stats = cachedStats(key);
    const fromFeed = feedMap.get(key) ?? null;
    const last = preferNewerLast(
      lastMap.get(key) ?? fromFeed,
      fromStore.get(key) ?? null,
    );
    const inApp = Boolean(fromFeed && last && fromFeed.id === last.id);
    const recentCount =
      last && Date.parse(last.publishedAt) >= since
        ? last.count
        : last
          ? Math.min(last.count, 1)
          : 0;
    return {
      handle: p.handle,
      name: p.name,
      group: p.group,
      followers: stats.followers,
      verified: stats.verified,
      avatar: stats.avatar,
      bio: stats.bio,
      lastPost: lastWithBuzz(last, p.handle, inApp),
      inFeed: recentCount,
      articles: last?.count ?? 0,
      longform: 0,
      likes: 0,
      engagement: 0,
      views: 0,
      er: buzzFor(p.handle)?.profileEr ?? 0,
    } satisfies InfluenceRow;
  });

  return base.sort(recencySort);
}

/** Lista imediata: 1 query posts leve + cache de perfis. Zero fxtwitter. */
export async function loadFontesFast(
  section: Category,
): Promise<InfluenceRow[]> {
  const [{ feed, last }, stored] = await Promise.all([
    lastPostsByAccount(section),
    hydrateStore(),
  ]);
  return buildRows(section, feed, last, stored);
}

/** Um passe de fxtwitter no cron: avatares + buzz de todo o catálogo. */
export async function enrichFontesCatalog(): Promise<InfluenceRow[]> {
  const seen = new Set<string>();
  const profiles = listKnownSections()
    .flatMap((section) => profilesFor(section))
    .filter((p) => {
      const key = norm(p.handle).toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  const missing = profiles.filter((p) => {
    const hit = userCache.get(norm(p.handle).toLowerCase());
    return (
      !hit ||
      Date.now() - hit.at >= USER_TTL ||
      (!hit.stats.followers && !hit.stats.avatar)
    );
  });
  if (missing.length) {
    await mapPool(missing.slice(0, 12), 6, (p) => fetchOne(p.handle));
  }
  const rows: InfluenceRow[] = [];
  const rowSeen = new Set<string>();
  for (const section of listKnownSections()) {
    for (const row of await loadFontesFast(section)) {
      const key = norm(row.handle).toLowerCase();
      if (rowSeen.has(key)) continue;
      rowSeen.add(key);
      rows.push(row);
    }
  }
  const needBuzz = rows
    .filter((r) => r.lastPost && !buzzIsFresh(r.handle, r.lastPost.id))
    .slice(0, 20);
  if (needBuzz.length) {
    await mapPool(needBuzz, 8, (r) => fetchLastBuzz(r.handle, r.lastPost?.id));
  }
  return rows;
}

export { invalidateFontesLastCache } from "./fontes-last";
