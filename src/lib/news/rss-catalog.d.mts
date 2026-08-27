export const MAX_RSS_ITEMS: number;

export type RssSeed = {
  url: string;
  title: string;
  section: string;
  group: string;
  account: string;
};

export const RSS_SEED: RssSeed[];

export function rssGroupFor(section: string): string;
export function rssExtrasFor(
  section: string,
  owned?: Array<{ url?: string; title?: string; section?: string; group?: string; account?: string }>,
): Array<{ handle: string; name: string; section: string; group: string; url: string }>;
export function rssAvatarUrl(url?: string): string;
export function rssBlurb(url?: string, title?: string): string;
export function rssSiteHref(
  account: string,
  owned?: Array<{ url?: string; account?: string }>,
): string;
export function rssFonteRow(p: {
  handle?: string;
  name?: string;
  group?: string;
  url?: string;
}): {
  handle: string;
  name: string;
  group: string;
  followers: number;
  verified: boolean;
  avatar: string | null;
  bio: string | null;
  siteUrl: string | null;
  lastPost: null;
  lastPosts: [];
  inFeed: number;
  articles: number;
  longform: number;
  likes: number;
  engagement: number;
  views: number;
  er: number;
};
export function mergeRssFontes<T extends { handle?: string }>(
  base: T[],
  owned: Array<{ url?: string; title?: string; section?: string; group?: string; account?: string }>,
  section: string,
): Array<T | ReturnType<typeof rssFonteRow>>;
export function rssLabelFor(
  account: string,
  owned?: Array<{ title?: string; account?: string }>,
): string;
export function isRssAccount(handle: string): boolean;
export function originsInHandles(handles: Iterable<string>): Array<"x" | "rss">;
export function storySourceFromAccount(
  account: string,
  opts?: {
    source?: string;
    postUrl?: string;
    owned?: Array<{ title?: string; account?: string }>;
  },
): { source: string; sourceLabel: string };
export function displaySourceByline(source: string, sourceLabel?: string | null): string;
export function displaySourceInitial(source: string, sourceLabel?: string | null): string;
export function displaySourceAt(source: string): string;
export function storyIsRss(story: { id?: string; source?: string } | null | undefined): boolean;
export function filterStoriesByOrigin<T extends { id?: string; source?: string }>(
  stories: T[],
  opts?: { showX?: boolean; showRss?: boolean },
): T[];
export function filterFontesByOrigin<T extends { handle?: string }>(
  rows: T[],
  opts?: { showX?: boolean; showRss?: boolean },
): T[];
export function fontesEmptyHint(opts?: {
  showX?: boolean;
  showRss?: boolean;
  sort?: string;
}): string;
