import assert from "node:assert/strict";
import test from "node:test";
import { ingestSurvives } from "../src/lib/news/rss-ingest-core.mjs";
import { youtubePostsFromItems } from "../src/lib/news/youtube-ingest-core.mjs";
import { parseFeedXml } from "../src/lib/news/rss-parse.mjs";
import { unpackMediaLabel } from "../src/lib/news/story-media-meta.mjs";

const YOUTUBE_FEED_MOCK = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <link rel="self" href="http://www.youtube.com/feeds/videos.xml?channel_id=UCXZCJLdBC09xxGZ6gcdrc6A"/>
 <title>OpenAI</title>
 <entry>
  <id>yt:video:S6TIVzqTmu8</id>
  <yt:videoId>S6TIVzqTmu8</yt:videoId>
  <yt:channelId>UCXZCJLdBC09xxGZ6gcdrc6A</yt:channelId>
  <title>GPT-5 Announcement</title>
  <link rel="alternate" href="https://www.youtube.com/watch?v=S6TIVzqTmu8"/>
  <published>2026-09-02T12:00:00+00:00</published>
  <media:group>
   <media:title>GPT-5 Announcement</media:title>
   <media:thumbnail url="https://i.ytimg.com/vi/S6TIVzqTmu8/hqdefault.jpg" width="480" height="360"/>
   <media:description>OpenAI presents the latest advancements in AI.</media:description>
  </media:group>
 </entry>
</feed>`;

test("ingestSurvives acknowledges YouTube writes when X fails", () => {
  assert.equal(ingestSurvives(true, 0, 1), true);
  assert.equal(ingestSurvives(true, 0, 0), false);
  assert.equal(ingestSurvives(false, 0, 0), true);
  assert.equal(ingestSurvives(true, 2, 0), true);
});

test("youtubePostsFromItems parses feed items, packs media_label with YouTube asset and sets post row attributes", () => {
  const channel = {
    account: "y_bdebf4a1823d",
    section: "ai",
  };
  const items = parseFeedXml(YOUTUBE_FEED_MOCK, "https://www.youtube.com/feeds/videos.xml");
  assert.equal(items.length, 1);

  const translated = {
    yt_S6TIVzqTmu8: {
      title: "Anúncio do GPT-5",
      summary: "OpenAI apresenta os mais recentes avanços em IA.",
    },
  };

  const rows = youtubePostsFromItems(channel, items, new Set(), "2026-09-02-12-00", translated);
  assert.equal(rows.length, 1);
  const row = rows[0];

  assert.equal(row.post_id, "yt_S6TIVzqTmu8");
  assert.equal(row.account, "y_bdebf4a1823d");
  assert.equal(row.source, "youtube");
  assert.equal(row.category, "ai");
  assert.equal(row.summary_pt, "Anúncio do GPT-5");
  assert.equal(row.translation_pt, "OpenAI apresenta os mais recentes avanços em IA.");
  assert.equal(row.image_url, "https://i.ytimg.com/vi/S6TIVzqTmu8/hqdefault.jpg");

  const packed = unpackMediaLabel(row.media_label);
  assert.equal(packed.label, "Vídeo");
  assert.ok(packed.meta);
  assert.equal(packed.meta.assets?.[0]?.type, "youtube");
  assert.equal(packed.meta.assets?.[0]?.videoId, "S6TIVzqTmu8");
});
