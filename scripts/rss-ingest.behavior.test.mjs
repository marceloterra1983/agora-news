import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { parseFeedXml } from "../src/lib/news/rss-parse.mjs";
import {
  ingestSurvives,
  rssPostsFromItems,
  skipRssResponse,
} from "../src/lib/news/rss-ingest-core.mjs";
import { isRssAccount } from "../src/lib/news/rss-catalog.mjs";
import { rssPostId } from "../src/lib/news/rss-id.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");
const fixture = (name) => readFileSync(join(root, "scripts/fixtures/rss", name), "utf8");

const feed = {
  url: "https://example.com/rss.xml",
  title: "Example",
  section: "ai",
  group: "imprensa",
  account: "r_bbbbbbbbbbbb",
};

test("304 does not write; garbage does not throw", () => {
  assert.equal(skipRssResponse(304), true);
  assert.equal(skipRssResponse(200), false);
  assert.equal(skipRssResponse(500), true);
  assert.deepEqual(parseFeedXml("<<<not xml>>>", feed.url), []);
  assert.deepEqual(rssPostsFromItems(feed, [], new Set(), "batch"), []);
});

test("rss translation_pt stays empty when the translator copied English", () => {
  const items = [
    {
      title: "Open models are the only path forward today.",
      summary: "The company announced the open model with the new weights.",
      link: "https://example.com/en",
      guid: "https://example.com/en",
      publishedAt: "2026-08-25T12:00:00.000Z",
    },
  ];
  const id = rssPostId(items[0].guid);
  const copied = rssPostsFromItems(feed, items, new Set(), "2026-08-25", {
    [id]: { title: items[0].title, summary: items[0].summary },
  });
  assert.equal(copied[0].translation_pt, "");
  const pt = rssPostsFromItems(feed, items, new Set(), "2026-08-25", {
    [id]: {
      title: "Modelos abertos são o único caminho.",
      summary: "A empresa também anunciou o modelo aberto hoje.",
    },
  });
  assert.equal(pt[0].translation_pt, "A empresa também anunciou o modelo aberto hoje.");
});

test("rss items write with source rss and skip known ids", () => {
  const items = parseFeedXml(fixture("rss2.xml"), feed.url);
  assert.equal(items.length, 2);
  const rows = rssPostsFromItems(feed, items, new Set(), "2026-08-25");
  assert.equal(rows.length, 2);
  assert.ok(rows.every((row) => row.source === "rss"));
  assert.ok(rows.every((row) => /^rss_[a-f0-9]{24}$/.test(row.post_id)));
  assert.ok(rows.every((row) => row.account === feed.account));
  const known = new Set([rows[0].post_id]);
  assert.equal(rssPostsFromItems(feed, items, known, "2026-08-25").length, 1);
});

test("X throw plus RSS write survives; r_* never hits fxtwitter", () => {
  assert.equal(ingestSurvives(true, 1), true);
  assert.equal(ingestSurvives(true, 0), false);
  assert.equal(ingestSurvives(false, 0), true);
  const ingest = read("src/lib/news/ingest.ts");
  const wrap = read("src/lib/news/ingest-wrap.ts");
  assert.match(ingest, /runIngestWithRss/);
  assert.match(ingest, /withRss/);
  assert.match(wrap, /ingestSurvives/);
  assert.match(wrap, /runRssIngest/);
  assert.match(read("src/lib/news/rss-ingest.ts"), /skipRssResponse/);
  assert.match(read("src/lib/news/rss-ingest.ts"), /rssPostsFromItems/);
  assert.match(read("src/lib/news/rss-ingest.ts"), /summarySrc === item\.title/);
  assert.match(read("src/lib/news/ingest-scan.ts"), /isRssAccount/);
  assert.match(read("src/lib/news/ingest-scan.ts"), /!isRssAccount\(handle\)/);
  assert.equal(isRssAccount("r_bea4293d5edd"), true);
  assert.equal(isRssAccount("OpenAI"), false);
});
