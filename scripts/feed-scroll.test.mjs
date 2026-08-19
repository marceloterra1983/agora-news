import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  consumeFeedScroll,
  markLeaveFeed,
  scrollToRestore,
} from "../src/lib/news/feed-scroll.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

test("scrollToRestore only returns a finite offset for the same section", () => {
  assert.equal(scrollToRestore(null, "ai"), null);
  assert.equal(scrollToRestore({ secao: "tech", y: 800 }, "ai"), null);
  assert.equal(scrollToRestore({ secao: "ai", y: Number.NaN }, "ai"), null);
  assert.equal(scrollToRestore({ secao: "ai", y: -4 }, "ai"), null);
  assert.equal(scrollToRestore({ secao: "ai", y: 0 }, "ai"), 0);
  assert.equal(scrollToRestore({ secao: "ai", y: 1240 }, "ai"), 1240);
});

test("markLeaveFeed then consumeFeedScroll returns y once", () => {
  const store = new Map();
  globalThis.sessionStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
  assert.equal(consumeFeedScroll("ai"), null);
  markLeaveFeed("ai", 1860);
  assert.equal(consumeFeedScroll("tech"), null);
  assert.equal(consumeFeedScroll("ai"), 1860);
  assert.equal(consumeFeedScroll("ai"), null);
});

test("article back uses history and the feed remembers /materia clicks", () => {
  const article = read("src/components/news/article-view.tsx");
  assert.match(article, /HistoryBackButton|history\.back/);
  assert.doesNotMatch(
    article,
    /<Link\s+to="\/"\s+search=\{\{\s*secao: story\.category/,
  );
  assert.match(read("src/router.tsx"), /scrollRestoration:\s*true/);
  const feed = read("src/components/news/feed.tsx");
  assert.match(feed, /markLeaveFeed/);
  assert.match(feed, /consumeFeedScroll/);
});
