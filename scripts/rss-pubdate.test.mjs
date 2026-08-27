import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { parseFeedXml, parseRssDate } from "../src/lib/news/rss-parse.mjs";
import {
  rssDateNeedsRepair,
  rssIdsToSkip,
  rssPostsFromItems,
} from "../src/lib/news/rss-ingest-core.mjs";
import { rssPostId } from "../src/lib/news/rss-id.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

const feed = {
  url: "https://rss.uol.com.br/feed/economia.xml",
  title: "UOL Economia",
  section: "brasil",
  account: "r_e0d5de43db4c",
};

test("UOL Portuguese pubDate becomes ISO, not empty", () => {
  assert.equal(
    parseRssDate("Qui, 27 Ago 2026 19:56:13 -0300"),
    "2026-08-27T22:56:13.000Z",
  );
  assert.equal(
    parseRssDate("Thu, 27 Aug 2026 19:56:13 -0300"),
    "2026-08-27T22:56:13.000Z",
  );
  assert.equal(parseRssDate("não é data"), "");
});

test("parsed UOL item keeps the feed clock, not ingest now()", () => {
  const xml = [
    `<?xml version="1.0" encoding="ISO-8859-1"?>`,
    `<rss><channel><item>`,
    `<title>CMN eleva limite</title>`,
    `<link>https://economia.uol.com.br/cmn</link>`,
    `<guid>https://economia.uol.com.br/cmn</guid>`,
    `<pubDate>Qui, 27 Ago 2026 19:56:13 -0300</pubDate>`,
    `<description>O CMN elevou o limite.</description>`,
    `</item></channel></rss>`,
  ].join("");
  const items = parseFeedXml(xml, feed.url);
  assert.equal(items[0].publishedAt, "2026-08-27T22:56:13.000Z");
  const rows = rssPostsFromItems(feed, items, new Set(), "batch");
  assert.equal(rows[0].posted_at, "2026-08-27T22:56:13.000Z");
});

test("stored ingest-now vs real pubDate needs repair", () => {
  assert.equal(
    rssDateNeedsRepair("2026-08-27T22:56:13.000Z", "2026-08-27T23:34:10.248Z"),
    true,
  );
  assert.equal(
    rssDateNeedsRepair("2026-08-27T22:56:13.000Z", "2026-08-27T22:56:40.000Z"),
    false,
  );
});

test("known id with a better pubDate is rewritten", () => {
  const id = rssPostId("https://economia.uol.com.br/cmn");
  const skip = rssIdsToSkip([id], {
    known: new Set([id]),
    poisoned: new Set(),
    latest: new Set([id]),
    dateRepair: new Set([id]),
  });
  assert.equal(skip.has(id), false);
});

test("ingest maps pubDate PT and dateRepair", () => {
  const ingest = read("src/lib/news/rss-ingest.ts");
  const parse = read("src/lib/news/rss-parse.mjs");
  assert.match(parse, /export function parseRssDate/);
  assert.match(ingest, /dateRepair/);
  assert.match(read("src/lib/news/cache.ts"), /agora:v3:rss:/);
});
