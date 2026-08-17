/** Métricas de post/perfil via fxtwitter — extraídas do Grok (reef-blade). */

import { isHighPostEr, isHighPostQuality, isHighPostReach } from "./metric-outlier.mjs";

export type PostBuzz = {
  likes: number;
  views: number;
  replies: number;
  reposts: number;
  quotes: number;
  bookmarks: number;
  er: number;
  profileEr: number;
};

const BUZZ_TTL = 20 * 60_000;
const buzzCache = new Map<string, { at: number } & PostBuzz>();

function engagementRate(b: Omit<PostBuzz, "er" | "profileEr">): number {
  if (b.views < 50) return 0;
  const reactions = b.likes + b.replies + b.reposts + b.quotes + b.bookmarks;
  if (reactions <= 0) return 0;
  return (reactions / b.views) * 100;
}

function fromTweet(row: {
  likes?: number;
  views?: number;
  replies?: number;
  reposts?: number;
  quotes?: number;
  bookmarks?: number;
}): Omit<PostBuzz, "er" | "profileEr"> {
  return {
    likes: Number(row.likes) || 0,
    views: Number(row.views) || 0,
    replies: Number(row.replies) || 0,
    reposts: Number(row.reposts) || 0,
    quotes: Number(row.quotes) || 0,
    bookmarks: Number(row.bookmarks) || 0,
  };
}

function pickBuzz(hit: { at: number } & PostBuzz): PostBuzz {
  return {
    likes: hit.likes,
    views: hit.views,
    replies: hit.replies,
    reposts: hit.reposts,
    quotes: hit.quotes,
    bookmarks: hit.bookmarks,
    er: hit.er,
    profileEr: hit.profileEr,
  };
}

export function buzzFor(handle: string, tweetId?: string): PostBuzz | null {
  const key = handle.toLowerCase();
  if (tweetId) {
    const hit = buzzCache.get(`${key}:${tweetId}`);
    if (hit) return pickBuzz(hit);
  }
  const hit = buzzCache.get(key);
  return hit ? pickBuzz(hit) : null;
}

export function exportBuzzCache(): Record<string, PostBuzz> {
  const out: Record<string, PostBuzz> = {};
  for (const [key, hit] of buzzCache) out[key] = pickBuzz(hit);
  return out;
}

export function importBuzzCache(map: Record<string, PostBuzz> | null | undefined): void {
  if (!map || typeof map !== "object") return;
  for (const [key, buzz] of Object.entries(map)) {
    if (!key || !buzz || typeof buzz !== "object") continue;
    if (buzzCache.has(key.toLowerCase())) continue;
    buzzCache.set(key.toLowerCase(), { at: Date.now(), ...buzz });
  }
}

export async function fetchLastBuzz(handle: string, tweetId?: string): Promise<PostBuzz | null> {
  const key = handle.toLowerCase();
  const tweetKey = tweetId ? `${key}:${tweetId}` : key;
  const hit = buzzCache.get(tweetKey) || buzzCache.get(key);
  if (hit && Date.now() - hit.at < BUZZ_TTL && typeof hit.profileEr === "number") {
    return pickBuzz(hit);
  }
  try {
    const res = await fetch(
      `https://api.fxtwitter.com/2/profile/${encodeURIComponent(handle)}/statuses?count=12`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(6_000) },
    );
    if (!res.ok) return hit ? pickBuzz(hit) : null;
    const body = (await res.json()) as {
      results?: Array<Parameters<typeof fromTweet>[0] & { id?: string }>;
    };
    const rows = body.results ?? [];
    if (!rows.length) return hit ? pickBuzz(hit) : null;
    const picked =
      tweetId ? rows.find((r) => String(r.id) === String(tweetId)) ?? rows[0] : rows[0];
    const first = fromTweet(picked);
    const rates = rows.map((r) => engagementRate(fromTweet(r))).filter((n) => n > 0);
    const profileEr = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
    const buzz: PostBuzz = { ...first, er: engagementRate(first), profileEr };
    buzzCache.set(key, { at: Date.now(), ...buzz });
    if (tweetId) buzzCache.set(tweetKey, { at: Date.now(), ...buzz });
    return buzz;
  } catch {
    return hit ? pickBuzz(hit) : null;
  }
}

export function buzzIsFresh(handle: string, tweetId?: string): boolean {
  const key = handle.toLowerCase();
  const hit = tweetId ? buzzCache.get(`${key}:${tweetId}`) || buzzCache.get(key) : buzzCache.get(key);
  return Boolean(hit && Date.now() - hit.at < BUZZ_TTL);
}

export function formatPostEr(
  post: { er?: number } | null | undefined,
  profileEr?: number,
): string {
  if (!isHighPostEr(post, profileEr)) return "";
  return formatRate(Number(post?.er) || 0);
}

/** Views ÷ seguidores. Só no card se o alcance for outlier (≥75% dos seguidores). */
export function formatPostReach(
  post: { views?: number } | null | undefined,
  followers?: number,
): string {
  if (!isHighPostReach(post, followers)) return "";
  const r = (Number(post?.views) || 0) / (Number(followers) || 0);
  if (r >= 1) {
    const x = r >= 10 ? r.toFixed(0) : r.toFixed(1).replace(".", ",").replace(/,0$/, "");
    return `${x}×`;
  }
  return formatRate(r * 100);
}

/** Respostas ÷ curtidas. Só no card se a conversa for outlier (≥25%). */
export function formatPostQuality(
  post: { replies?: number; likes?: number } | null | undefined,
): string {
  if (!isHighPostQuality(post)) return "";
  return formatRate(((Number(post?.replies) || 0) / (Number(post?.likes) || 0)) * 100);
}

export function formatRate(pct: number): string {
  if (!pct) return "—";
  if (pct >= 10) return `${pct.toFixed(0)}%`;
  if (pct >= 1) return `${pct.toFixed(1).replace(".", ",")}%`;
  return `${pct.toFixed(2).replace(".", ",")}%`;
}
