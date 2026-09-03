import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

test("StoryCard reader variant renders video thumbnail in front of text for YouTube stories", () => {
  const src = read("src/components/news/story-card.tsx");
  assert.match(src, /isYt\s*&&\s*story\.image/);
  assert.match(src, /data-testid=["']feed-video-thumbnail["']/);
  assert.match(src, /aspect-video/);
  assert.match(src, /<Play\b/);
  assert.match(src, /onClick=\{\(\)\s*=>\s*onOpenStory\(story\)\}/);
});
