import type { RssFeed } from "./rss-feeds";

export function seedRssAccounts(): Set<string>;
export function assertHttpsRssUrl(url: string): string;
export function canRemoveRssFeed(account: string, seedAccounts?: Set<string>): boolean;
export function addOwnedRssFeed(existing: RssFeed[], feed: RssFeed): RssFeed[];
export function removeOwnedRssFeed(
  existing: RssFeed[],
  account: string,
  seedAccounts?: Set<string>,
): RssFeed[];
