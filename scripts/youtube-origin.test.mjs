import assert from "node:assert/strict";
import test from "node:test";
import { filterStoriesByOrigin, filterFontesByOrigin } from "../src/lib/news/rss-catalog.mjs";
import { DEFAULT_SETTINGS, mergeSettingsBlob } from "../src/lib/news/settings.ts";

const xStory = { id: "123", source: "openai" };
const rssStory = { id: "rss_deadbeef", source: "r_123456789012" };
const ytStory = { id: "yt_dQw4w9WgXcQ", source: "y_123456789012" };

test("DEFAULT_SETTINGS includes showYouTube as true", () => {
  assert.equal(DEFAULT_SETTINGS.showYouTube, true);
});

test("mergeSettingsBlob preserves showYouTube", () => {
  const merged = mergeSettingsBlob(
    { showYouTube: false },
    { showYouTube: true, showX: true, showRss: true },
  );
  assert.equal(merged.showYouTube, false);
});

test("filterStoriesByOrigin respects showYouTube flag", () => {
  const list = [xStory, rssStory, ytStory];
  assert.deepEqual(filterStoriesByOrigin(list, { showX: true, showRss: true, showYouTube: true }), list);
  assert.deepEqual(filterStoriesByOrigin(list, { showX: true, showRss: true, showYouTube: false }), [xStory, rssStory]);
  assert.deepEqual(filterStoriesByOrigin(list, { showX: false, showRss: false, showYouTube: true }), [ytStory]);
  assert.deepEqual(filterStoriesByOrigin(list, { showX: false, showRss: false, showYouTube: false }), []);
});

test("filterFontesByOrigin respects showYouTube flag for y_* accounts", () => {
  const xRow = { handle: "openai" };
  const rssRow = { handle: "r_123456789012" };
  const ytRow = { handle: "y_123456789012" };
  const rows = [xRow, rssRow, ytRow];

  assert.deepEqual(filterFontesByOrigin(rows, { showX: true, showRss: true, showYouTube: true }), rows);
  assert.deepEqual(filterFontesByOrigin(rows, { showX: true, showRss: true, showYouTube: false }), [xRow, rssRow]);
  assert.deepEqual(filterFontesByOrigin(rows, { showX: false, showRss: false, showYouTube: true }), [ytRow]);
});
