import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { isRssAccount, originsInHandles } from "../src/lib/news/rss-catalog.mjs";

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
    "src/routes/fontes.tsx",
  ]) {
    assert.match(read(rel), /OriginMark/);
  }
});

test("originsInHandles is x, rss or both", () => {
  assert.deepEqual(originsInHandles(["openai"]), ["x"]);
  assert.deepEqual(originsInHandles(["r_bea4293d5edd"]), ["rss"]);
  assert.deepEqual(originsInHandles(["openai", "r_bea4293d5edd"]), ["x", "rss"]);
  assert.deepEqual(originsInHandles([]), []);
});

test("group headers render g.origins next to ChevronDown", () => {
  const src = read("src/routes/fontes.tsx");
  const mark = src.indexOf("{g.origins.map");
  const chevron = src.indexOf("<ChevronDown");
  assert.ok(mark > 0 && mark < chevron && chevron - mark < 220);
  assert.match(src, /data-group-origins=\{g\.origins\.join/);
  assert.match(read("src/lib/news/fontes-sort.ts"), /originsInHandles/);
});

test("Fontes OriginMark sits next to ChevronDown", () => {
  const src = read("src/components/news/fontes-profile-row.tsx");
  const name = src.indexOf("{row.name}");
  const mark = src.indexOf("<OriginMark");
  const chevron = src.indexOf("<ChevronDown");
  assert.ok(mark > name, "mark stays after the name");
  assert.ok(mark < chevron && chevron - mark < 180, "mark is immediately before ChevronDown");
  assert.ok(src.indexOf("<GroupTag") < mark, "group stays with the name, not the chevron");
});

test("feed reader OriginMark sits next to Bookmark save", () => {
  const src = read("src/components/news/story-card.tsx");
  const reader = src.slice(0, src.indexOf('variant === "grid"'));
  const byline = reader.indexOf("{byline}");
  const mark = reader.lastIndexOf("<OriginMark");
  const save = reader.indexOf("Salvar matéria", mark);
  assert.ok(mark > byline, "mark is not next to the byline");
  assert.ok(save > mark && save - mark < 150, "mark is immediately before the save control");
});
