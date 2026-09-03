import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

test("YouTubeEmbed accepts autoPlay prop to activate player directly", () => {
  const src = read("src/components/news/youtube-embed.tsx");
  assert.match(src, /autoPlay\s*=\s*false/);
  assert.match(src, /const\s*\[active,\s*setActive\]\s*=\s*useState\(autoPlay\)/);
});

test("StoryAssetBlock forwards autoPlay to YouTubeEmbed", () => {
  const src = read("src/components/news/story-media.tsx");
  assert.match(src, /autoPlay\s*=\s*false/);
  assert.match(src, /<YouTubeEmbed[\s\S]*?autoPlay=\{autoPlay\}/);
});

test("ArticleView forwards autoPlay={embedded} to StoryAssetBlock", () => {
  const src = read("src/components/news/article-view.tsx");
  assert.match(src, /<StoryAssetBlock[\s\S]*?autoPlay=\{embedded\}/);
});
