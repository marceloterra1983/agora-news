export const FEED_SCROLL_KEY = "agora-feed-scroll-v1";

export type FeedScrollMark = {
  secao: string;
  y: number;
};

export function scrollToRestore(
  stored: FeedScrollMark | null,
  secao: string,
): number | null {
  if (!stored || stored.secao !== secao) return null;
  if (!Number.isFinite(stored.y) || stored.y < 0) return null;
  return stored.y;
}

function session(): Pick<Storage, "getItem" | "setItem" | "removeItem"> | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

function readMark(): FeedScrollMark | null {
  const ss = session();
  if (!ss) return null;
  try {
    const raw = ss.getItem(FEED_SCROLL_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Partial<FeedScrollMark>;
    if (typeof o.secao !== "string" || typeof o.y !== "number") return null;
    return { secao: o.secao, y: o.y };
  } catch {
    return null;
  }
}

export function markLeaveFeed(secao: string, y: number) {
  const ss = session();
  if (!ss || !secao) return;
  try {
    ss.setItem(FEED_SCROLL_KEY, JSON.stringify({ secao, y }));
  } catch {
    /* quota / private mode */
  }
}

export function consumeFeedScroll(secao: string): number | null {
  const y = scrollToRestore(readMark(), secao);
  if (y == null) return null;
  try {
    session()?.removeItem(FEED_SCROLL_KEY);
  } catch {
    /* ignore */
  }
  return y;
}

export function currentScrollY(): number {
  if (typeof window === "undefined") return 0;
  return window.scrollY || document.documentElement.scrollTop || 0;
}

export function restoreScrollY(y: number) {
  if (typeof window === "undefined") return;
  window.scrollTo({ top: y, left: 0, behavior: "auto" });
}
