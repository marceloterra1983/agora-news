/** Métricas de post/perfil via fxtwitter — extraídas do Grok (reef-blade). */

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

export function buzzFor(handle: string): PostBuzz | null {
  const hit = buzzCache.get(handle.toLowerCase());
  return hit ? pickBuzz(hit) : null;
}

export async function fetchLastBuzz(handle: string): Promise<PostBuzz | null> {
  const key = handle.toLowerCase();
  const hit = buzzCache.get(key);
  if (hit && Date.now() - hit.at < BUZZ_TTL && typeof hit.profileEr === "number") {
    return pickBuzz(hit);
  }
  try {
    const res = await fetch(
      `https://api.fxtwitter.com/2/profile/${encodeURIComponent(handle)}/statuses?count=12`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(6_000) },
    );
    if (!res.ok) return hit ? pickBuzz(hit) : null;
    const body = (await res.json()) as { results?: Array<Parameters<typeof fromTweet>[0]> };
    const rows = body.results ?? [];
    if (!rows.length) return hit ? pickBuzz(hit) : null;
    const first = fromTweet(rows[0]);
    const rates = rows.map((r) => engagementRate(fromTweet(r))).filter((n) => n > 0);
    const profileEr = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
    const buzz: PostBuzz = { ...first, er: engagementRate(first), profileEr };
    buzzCache.set(key, { at: Date.now(), ...buzz });
    return buzz;
  } catch {
    return hit ? pickBuzz(hit) : null;
  }
}

export function buzzIsFresh(handle: string): boolean {
  const hit = buzzCache.get(handle.toLowerCase());
  return Boolean(hit && Date.now() - hit.at < BUZZ_TTL);
}

export async function getProfileMetrics(handle: string): Promise<{ profileEr: number }> {
  const buzz = await fetchLastBuzz(handle.replace(/^@+/, "").trim());
  return { profileEr: buzz?.profileEr ?? 0 };
}

export function formatPostEr(post: { er?: number } | null | undefined): string {
  const er = Number(post?.er) || 0;
  if (er <= 0) return "";
  return formatRate(er);
}

/** Views ÷ seguidores. >100% = o post saiu da bolha. */
export function formatPostReach(
  post: { views?: number } | null | undefined,
  followers?: number,
): string {
  const views = Number(post?.views) || 0;
  const fol = Number(followers) || 0;
  if (views < 50 || fol < 100) return "";
  const r = views / fol;
  if (r >= 1) {
    const x = r >= 10 ? r.toFixed(0) : r.toFixed(1).replace(".", ",").replace(/,0$/, "");
    return `${x}×`;
  }
  const pct = r * 100;
  if (pct < 0.05) return "";
  return formatRate(pct);
}

/** Respostas ÷ curtidas. Alto = conversa; baixo = like passivo. */
export function formatPostQuality(
  post: { replies?: number; likes?: number } | null | undefined,
): string {
  const likes = Number(post?.likes) || 0;
  const replies = Number(post?.replies) || 0;
  if (likes < 10) return "";
  return formatRate((replies / likes) * 100);
}

export function formatRate(pct: number): string {
  if (!pct) return "—";
  if (pct >= 10) return `${pct.toFixed(0)}%`;
  if (pct >= 1) return `${pct.toFixed(1).replace(".", ",")}%`;
  return `${pct.toFixed(2).replace(".", ",")}%`;
}
