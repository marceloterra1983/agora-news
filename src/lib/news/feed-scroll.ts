export const FEED_SCROLL_KEY = "agora-feed-scroll-v1";

export type LeavePath = "/" | "/fontes";

export type FeedScrollMark = {
  secao: string;
  y: number;
  path?: LeavePath;
  open?: string;
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
    const path = o.path === "/fontes" ? "/fontes" : "/";
    const open = typeof o.open === "string" && o.open ? o.open : undefined;
    return { secao: o.secao, y: o.y, path, open };
  } catch {
    return null;
  }
}

export function markLeavePage(mark: FeedScrollMark) {
  const ss = session();
  if (!ss || !mark.secao) return;
  try {
    ss.setItem(
      FEED_SCROLL_KEY,
      JSON.stringify({
        secao: mark.secao,
        y: mark.y,
        path: mark.path || "/",
        open: mark.open || undefined,
      }),
    );
  } catch {
    /* quota / private mode */
  }
}

export function markLeaveFeed(secao: string, y: number) {
  markLeavePage({ secao, y, path: "/" });
}

export function peekLeavePage(): FeedScrollMark | null {
  return readMark();
}

function takeMark(path: LeavePath, secao: string): FeedScrollMark | null {
  const stored = readMark();
  if (!stored || stored.secao !== secao) return null;
  if ((stored.path || "/") !== path) return null;
  if (scrollToRestore(stored, secao) == null) return null;
  try {
    session()?.removeItem(FEED_SCROLL_KEY);
  } catch {
    /* ignore */
  }
  return stored;
}

export function consumeLeavePage(path: LeavePath, secao: string): FeedScrollMark | null {
  return takeMark(path, secao);
}

export function consumeFeedScroll(secao: string): number | null {
  return takeMark("/", secao)?.y ?? null;
}

export function currentScrollY(): number {
  if (typeof window === "undefined") return 0;
  return window.scrollY || document.documentElement.scrollTop || 0;
}

export function restoreScrollY(y: number) {
  if (typeof window === "undefined") return;
  window.scrollTo({ top: y, left: 0, behavior: "auto" });
}
