import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  filterStoriesByOrigin,
  storyIsRss,
} from "../src/lib/news/rss-catalog.mjs";
import { writeSettings } from "../src/lib/news/settings.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

const x = { id: "123", source: "g1", sourceLabel: "@g1" };
const rss = { id: "rss_aabb", source: "r_9c68d283ae03", sourceLabel: "TecMundo" };

function withDom(t) {
  const values = new Map();
  const dataset = {};
  const localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
  const window = { localStorage, dispatchEvent() { return true; } };
  const document = { documentElement: { dataset } };
  const prevW = Object.getOwnPropertyDescriptor(globalThis, "window");
  const prevD = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "window", { configurable: true, value: window });
  Object.defineProperty(globalThis, "document", { configurable: true, value: document });
  t.after(() => {
    if (prevW) Object.defineProperty(globalThis, "window", prevW);
    else delete globalThis.window;
    if (prevD) Object.defineProperty(globalThis, "document", prevD);
    else delete globalThis.document;
  });
}

test("storyIsRss detects seed hash and rss_ id", () => {
  assert.equal(storyIsRss(rss), true);
  assert.equal(storyIsRss({ id: "rss_deadbeef", source: "site" }), true);
  assert.equal(storyIsRss(x), false);
});

test("filterStoriesByOrigin keeps chronological subset", () => {
  const list = [x, rss];
  assert.deepEqual(filterStoriesByOrigin(list, { showX: true, showRss: true }), list);
  assert.deepEqual(filterStoriesByOrigin(list, { showX: true, showRss: false }), [x]);
  assert.deepEqual(filterStoriesByOrigin(list, { showX: false, showRss: true }), [rss]);
  assert.deepEqual(filterStoriesByOrigin(list, { showX: false, showRss: false }), []);
});

test("writeSettings persists showX/showRss", (t) => {
  withDom(t);
  const next = writeSettings({ showX: false, showRss: true });
  assert.equal(next.showX, false);
  assert.equal(next.showRss, true);
  const stored = JSON.parse(window.localStorage.getItem("agora-settings-v3"));
  assert.equal(stored.showX, false);
  assert.equal(stored.showRss, true);
});

test("chrome, feed and salvos wire the origin switch", () => {
  const chrome = read("src/components/news/app-chrome.tsx");
  const feed = read("src/components/news/feed.tsx");
  const salvos = read("src/routes/salvos.tsx");
  const switchSrc = read("src/components/news/origin-switch.tsx");
  assert.match(chrome, /OriginSwitch/);
  assert.match(switchSrc, /data-origin-switch/);
  assert.match(switchSrc, /data-origin=["']x["']/);
  assert.match(switchSrc, /data-origin=["']rss["']/);
  assert.match(switchSrc, /XLogo/);
  assert.match(feed, /filterStoriesByOrigin|storyIsRss/);
  assert.match(salvos, /filterStoriesByOrigin/);
});
