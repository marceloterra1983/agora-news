import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { mergeCloudPrefs } from "../src/lib/news/prefs-merge.ts";
import {
  addOwnedRssFeed,
  removeOwnedRssFeed,
  seedRssAccounts,
} from "../src/lib/news/rss-owned.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

const owned = {
  url: "https://example.com/feed.xml",
  title: "Example",
  section: "ai",
  group: "imprensa",
  account: "r_aaaaaaaaaaaa",
};

test("http url and seed remove are rejected; duplicate url is rejected", () => {
  assert.throws(() => addOwnedRssFeed([], { ...owned, url: "http://example.com/feed.xml" }), /rss_https_only/);
  assert.throws(() => addOwnedRssFeed([owned], owned), /rss_duplicate/);
  const seed = [...seedRssAccounts()][0];
  assert.throws(() => removeOwnedRssFeed([owned], seed), /rss_seed_readonly/);
  assert.deepEqual(removeOwnedRssFeed([owned], owned.account), []);
});

test("snapshotPrefs and merge keep rssFeeds", () => {
  const sync = read("src/lib/news/prefs-sync.ts");
  const server = read("src/lib/news/prefs-server.ts");
  assert.match(sync, /rssFeeds:\s*loadRssFeeds/);
  assert.match(sync, /replaceRssFeeds/);
  assert.match(server, /rssFeeds\?:/);
  const kept = mergeCloudPrefs({ starred: [] }, { rssFeeds: [owned] }, false);
  assert.deepEqual(kept.rssFeeds, [owned]);
  const remoteWins = mergeCloudPrefs({ rssFeeds: [] }, { rssFeeds: [owned] }, false);
  assert.deepEqual(remoteWins.rssFeeds, []);
});
