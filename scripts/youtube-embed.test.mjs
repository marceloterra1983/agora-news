import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { extractYouTubeId, YOUTUBE_ID_RE, extractChannelIdFromHtml, youtubeFeedUrl } from "../src/lib/news/youtube-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

test("extractYouTubeId handles various YouTube URL shapes and raw IDs", () => {
  assert.equal(extractYouTubeId("dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(extractYouTubeId("https://www.youtube.com/shorts/F5_G0AHfYhI"), "F5_G0AHfYhI");
  assert.equal(extractYouTubeId("not-a-valid-url"), "");
  assert.match("dQw4w9WgXcQ", YOUTUBE_ID_RE);
});

test("extractChannelIdFromHtml extracts canonical channel ID from link tags and meta", () => {
  const htmlLink = '<link rel="alternate" type="application/rss+xml" href="https://www.youtube.com/feeds/videos.xml?channel_id=UCXZCJLdBC09xxGZ6gcdrc6A">';
  assert.equal(extractChannelIdFromHtml(htmlLink), "UCXZCJLdBC09xxGZ6gcdrc6A");
  assert.equal(youtubeFeedUrl("UCXZCJLdBC09xxGZ6gcdrc6A"), "https://www.youtube.com/feeds/videos.xml?channel_id=UCXZCJLdBC09xxGZ6gcdrc6A");
});

test("YouTubeEmbed component enforces facade pattern and privacy-enhanced domain", () => {
  const src = read("src/components/news/youtube-embed.tsx");
  assert.match(src, /data-youtube-facade/);
  assert.match(src, /data-youtube-player/);
  assert.match(src, /youtube-nocookie\.com\/embed/);
  assert.match(src, /modestbranding=1/);
  assert.match(src, /loading=["']lazy["']/);
  assert.match(src, /data-testid=["']youtube-play-btn["']/);
});

test("StoryAssetBlock wires YouTubeEmbed for youtube asset types", () => {
  const src = read("src/components/news/story-media.tsx");
  assert.match(src, /import \{ YouTubeEmbed \} from ["']\.\/youtube-embed["']/);
  assert.match(src, /asset\.type === ["']youtube["']/);
  assert.match(src, /<YouTubeEmbed/);
});
