import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

test("article video is muted looping and does not autoplay when motion is reduced", () => {
  const src = read("src/components/news/story-media.tsx");
  const block = src.slice(src.indexOf("export function StoryAssetBlock"));
  const video = block.match(/<video\b[\s\S]*?<\/video>/)?.[0];
  assert.ok(video, "StoryAssetBlock precisa renderizar <video>");
  assert.doesNotMatch(video, /\bautoPlay\b/);
  assert.match(video, /\bmuted\b/);
  assert.match(video, /\bloop\b/);
  assert.match(video, /\bplaysInline\b/);
  assert.match(video, /referrerPolicy=["']no-referrer["']/);
  assert.match(block, /prefers-reduced-motion/);
  assert.match(block, /dataset\.motion/);
  assert.match(block, /\.play\(/);
  assert.match(block, /\.pause\(/);
});

test("Fontes avatars omit the page referrer", () => {
  const row = read("src/components/news/fontes-profile-row.tsx");
  const page = read("src/routes/fontes.tsx");
  assert.match(row, /<img[\s\S]*?referrerPolicy=["']no-referrer["']/);
  assert.match(page, /<img[\s\S]*?referrerPolicy=["']no-referrer["']/);
});

test("document referrer is same-origin so Chromium media can fetch X MP4s", () => {
  const src = read("src/routes/__root.tsx");
  assert.match(src, /["']Referrer-Policy["']\s*:\s*["']same-origin["']/);
  assert.match(
    src,
    /name:\s*["']referrer["'][\s\S]{0,80}content:\s*["']same-origin["']/,
  );
});
