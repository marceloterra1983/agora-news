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
): Array<{ handle: string; name: string; section: string; group: string }>;
export function rssLabelFor(
  account: string,
  owned?: Array<{ title?: string; account?: string }>,
): string;
export function isRssAccount(handle: string): boolean;
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
