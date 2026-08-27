import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { isRssAccount } from "../src/lib/news/rss-catalog.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

test("OriginMark marks r_* as rss and other handles as x", () => {
  const src = read("src/components/news/origin-mark.tsx");
  assert.equal(isRssAccount("r_bea4293d5edd"), true);
  assert.equal(isRssAccount("openai"), false);
  assert.match(src, /data-origin-mark=\{rss \? ["']rss["'] : ["']x["']\}/);
  assert.match(src, /isRssAccount/);
  assert.match(src, /XLogo/);
  assert.match(src, /<Rss/);
});

test("Fontes, feed, article and popup wire OriginMark", () => {
  for (const rel of [
    "src/components/news/fontes-profile-row.tsx",
    "src/components/news/story-card.tsx",
    "src/components/news/article-view.tsx",
    "src/components/news/feed-profile-popup.tsx",
  ]) {
    assert.match(read(rel), /OriginMark/);
  }
});
