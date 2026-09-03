import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  YOUTUBE_BACKFILL_HOURS,
  YOUTUBE_BACKFILL_LIMIT,
  mergeFeedStories,
  moreCursorIso,
  youtubeHandlesIn,
} from "../src/lib/news/feed-more.mjs";
import { youtubePostedAtIsFresh } from "../src/lib/news/youtube-core.mjs";
import { youtubePostsFromItems } from "../src/lib/news/youtube-ingest-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

const NOW = Date.parse("2026-09-03T05:00:00.000Z");

test("moreCursorIso ignores YouTube so +12h does not jump to a 2012 video", () => {
  assert.equal(
    moreCursorIso([
      { id: "x1", source: "openai", publishedAt: "2026-09-03T04:00:00.000Z" },
      { id: "yt_old", source: "y_6f10a402c8cd", publishedAt: "2012-11-29T21:28:45.000Z" },
    ]),
    "2026-09-03T04:00:00.000Z",
  );
  assert.equal(
    moreCursorIso([{ id: "yt_only", source: "y_bdebf4a1823d", publishedAt: "2026-09-02T21:15:54.000Z" }]),
    "2026-09-02T21:15:54.000Z",
  );
  assert.equal(moreCursorIso([]), "");
});

test("mergeFeedStories backfills fresh YouTube and drops stale or duplicate ids", () => {
  const primary = [
    { id: "x1", source: "openai", publishedAt: "2026-09-03T04:40:00.000Z" },
    { id: "yt_hO_OcLTQjsw", source: "y_bfcadd1ca989", publishedAt: "2026-09-02T21:00:18.000Z" },
  ];
  const extra = [
    { id: "yt_hO_OcLTQjsw", source: "y_bfcadd1ca989", publishedAt: "2026-09-02T21:00:18.000Z" },
    { id: "yt_U57EdncoDM4", source: "y_6f68d1502930", publishedAt: "2026-09-02T13:11:53.000Z" },
    { id: "yt_-yGHG3pnHLg", source: "y_83cbea10449e", publishedAt: "2023-12-16T13:41:38.000Z" },
  ];
  const merged = mergeFeedStories(primary, extra, NOW);
  assert.deepEqual(
    merged.map((s) => s.id),
    ["x1", "yt_hO_OcLTQjsw", "yt_U57EdncoDM4"],
  );
});

test("youtubePostedAtIsFresh rejects ancient and unparseable dates", () => {
  assert.equal(youtubePostedAtIsFresh("2026-09-02T21:00:18.000Z", NOW), true);
  assert.equal(youtubePostedAtIsFresh("2012-11-29T21:28:45.000Z", NOW), false);
  assert.equal(youtubePostedAtIsFresh("2023-12-16T13:41:38.000Z", NOW), false);
  assert.equal(youtubePostedAtIsFresh("", NOW), false);
  assert.equal(youtubePostedAtIsFresh("not-a-date", NOW), false);
});

test("youtubeHandlesIn keeps only y_* accounts", () => {
  assert.deepEqual(youtubeHandlesIn(["OpenAI", "y_bdebf4a1823d", "r_9c68d283ae03"]), ["y_bdebf4a1823d"]);
  assert.deepEqual(youtubeHandlesIn([]), []);
});

test("youtubePostsFromItems skips videos older than the freshness window", () => {
  const rows = youtubePostsFromItems(
    { account: "y_6f10a402c8cd", section: "ai" },
    [
      {
        videoId: "sY6aClejCcw",
        title: "old",
        summary: "old",
        publishedAt: "2012-11-29T21:28:45.000Z",
        link: "https://www.youtube.com/watch?v=sY6aClejCcw",
      },
      {
        videoId: "abcdefghijk",
        title: "fresh",
        summary: "fresh",
        publishedAt: "2026-09-02T12:00:00.000Z",
        link: "https://www.youtube.com/watch?v=abcdefghijk",
      },
    ],
    new Set(),
    "batch",
    {},
    NOW,
  );
  assert.deepEqual(
    rows.map((r) => r.post_id),
    ["yt_abcdefghijk"],
  );
});

test("feed, loader and +12h button wire YouTube backfill and a non-YouTube cursor", () => {
  const feedUi = read("src/components/news/feed.tsx");
  const feed = read("src/lib/news/feed.ts");
  const news = read("src/lib/news/server-news.ts");
  assert.match(feedUi, /feedMoreCursor|moreCursorIso/);
  assert.match(feedUi, /showYouTube/);
  assert.match(feed, /mergeLatestYouTube|mergeFeedStories/);
  assert.match(feed, /downloadLatestYouTube/);
  assert.match(news, /mergeFeedStories/);
  assert.match(news, /youtubeHandlesIn/);
  assert.equal(YOUTUBE_BACKFILL_LIMIT, 12);
  assert.equal(YOUTUBE_BACKFILL_HOURS, 168);
});
