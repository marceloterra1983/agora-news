import assert from "node:assert/strict";
import test from "node:test";
import { parseFeedXml } from "../src/lib/news/rss-parse.mjs";

const YOUTUBE_ATOM_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <link rel="self" href="http://www.youtube.com/feeds/videos.xml?channel_id=UCHnyfMqiRRG1u-2MsSQLbXA"/>
 <id>yt:channel:HnyfMqiRRG1u-2MsSQLbXA</id>
 <yt:channelId>HnyfMqiRRG1u-2MsSQLbXA</yt:channelId>
 <title>Veritasium</title>
 <link rel="alternate" href="https://www.youtube.com/channel/UCHnyfMqiRRG1u-2MsSQLbXA"/>
 <author>
  <name>Veritasium</name>
  <uri>https://www.youtube.com/channel/UCHnyfMqiRRG1u-2MsSQLbXA</uri>
 </author>
 <published>2010-07-21T07:18:02+00:00</published>
 <entry>
  <id>yt:video:F5_G0AHfYhI</id>
  <yt:videoId>F5_G0AHfYhI</yt:videoId>
  <yt:channelId>UCHnyfMqiRRG1u-2MsSQLbXA</yt:channelId>
  <title>A Physics Professor Bet Me $10,000</title>
  <link rel="alternate" href="https://www.youtube.com/watch?v=F5_G0AHfYhI"/>
  <author>
   <name>Veritasium</name>
   <uri>https://www.youtube.com/channel/UCHnyfMqiRRG1u-2MsSQLbXA</uri>
  </author>
  <published>2026-09-02T13:00:04+00:00</published>
  <updated>2026-09-02T18:57:22+00:00</updated>
  <media:group>
   <media:title>A Physics Professor Bet Me $10,000</media:title>
   <media:content url="https://www.youtube.com/v/F5_G0AHfYhI?version=3" type="application/x-shockwave-flash" width="640" height="390"/>
   <media:thumbnail url="https://i3.ytimg.com/vi/F5_G0AHfYhI/hqdefault.jpg" width="480" height="360"/>
   <media:description>A UCLA Physics Professor bet me $10,000 that my video was wrong. Here is how we proved it.</media:description>
  </media:group>
 </entry>
</feed>`;

test("parseFeedXml extracts media:description, thumbnail and videoId for YouTube feeds", () => {
  const items = parseFeedXml(YOUTUBE_ATOM_FIXTURE, "https://www.youtube.com/feeds/videos.xml");
  assert.equal(items.length, 1);
  const item = items[0];
  assert.equal(item.guid, "yt:video:F5_G0AHfYhI");
  assert.equal(item.title, "A Physics Professor Bet Me $10,000");
  assert.equal(item.link, "https://www.youtube.com/watch?v=F5_G0AHfYhI");
  assert.equal(item.videoId, "F5_G0AHfYhI");
  assert.equal(item.imageUrl, "https://i3.ytimg.com/vi/F5_G0AHfYhI/hqdefault.jpg");
  assert.match(item.summary, /A UCLA Physics Professor/);
  assert.equal(item.publishedAt, "2026-09-02T13:00:04.000Z");
});
