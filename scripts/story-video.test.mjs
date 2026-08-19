import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

test("article video autoplays muted without sending a page referrer", () => {
  const src = read("src/components/news/story-media.tsx");
  const block = src.slice(src.indexOf("export function StoryAssetBlock"));
  const video = block.match(/<video\b[\s\S]*?<\/video>/)?.[0];
  assert.ok(video, "StoryAssetBlock precisa renderizar <video>");
  assert.match(video, /\bautoPlay\b/);
  assert.match(video, /\bmuted\b/);
  assert.match(video, /\bloop\b/);
  assert.match(video, /\bplaysInline\b/);
  assert.match(video, /referrerPolicy=["']no-referrer["']/);
  assert.match(block, /\.play\(/);
  assert.match(block, /\.muted\s*=\s*true/);
});
