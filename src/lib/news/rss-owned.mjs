import { RSS_SEED } from "./rss-catalog.mjs";

export function seedRssAccounts() {
  return new Set(RSS_SEED.map((row) => String(row.account)));
}

export function assertHttpsRssUrl(url) {
  const raw = String(url || "").trim();
  if (!/^https:\/\//i.test(raw)) {
    const err = new Error("rss_https_only");
    throw err;
  }
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("rss_url_invalid");
  }
  if (parsed.protocol !== "https:") throw new Error("rss_https_only");
  return parsed.href;
}

export function canRemoveRssFeed(account, seedAccounts = seedRssAccounts()) {
  return Boolean(account) && !seedAccounts.has(account);
}

export function addOwnedRssFeed(existing, feed) {
  const url = assertHttpsRssUrl(feed.url);
  const account = String(feed.account || "");
  const list = Array.isArray(existing) ? existing : [];
  if (list.some((row) => row.url === url || row.account === account)) {
    throw new Error("rss_duplicate");
  }
  return [...list, { ...feed, url, account }];
}

export function removeOwnedRssFeed(existing, account, seedAccounts = seedRssAccounts()) {
  if (!canRemoveRssFeed(account, seedAccounts)) throw new Error("rss_seed_readonly");
  return (Array.isArray(existing) ? existing : []).filter((row) => row.account !== account);
}
