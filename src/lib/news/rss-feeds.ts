export type RssFeed = {
  url: string;
  title: string;
  section: string;
  group: string;
  account: string;
};

const KEY = "agora-rss-feeds-v1";
const EVENT = "agora-rss-feeds";

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT));
}

export function loadRssFeeds(): RssFeed[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row) => row && typeof row === "object")
      .map((row) => row as RssFeed)
      .filter((row) => row.url && row.account && row.section);
  } catch {
    return [];
  }
}

export function replaceRssFeeds(feeds: RssFeed[], opts?: { silent?: boolean }) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(feeds));
  } catch {
    /* quota */
  }
  if (!opts?.silent) emit();
}

export function upsertRssFeed(feed: RssFeed) {
  const next = loadRssFeeds().filter(
    (row) => row.account !== feed.account && row.url !== feed.url,
  );
  next.push(feed);
  replaceRssFeeds(next);
}

export function removeRssFeed(account: string) {
  replaceRssFeeds(loadRssFeeds().filter((row) => row.account !== account));
}

export function onRssFeeds(fn: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}
