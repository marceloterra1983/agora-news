import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(root, "src/lib/news/ingest-fetch.ts"), "utf8");

test("existingIds regex accepts yt_ YouTube post IDs", () => {
  assert.match(src, /yt_\[a-zA-Z0-9_-\]\{11\}/);
  assert.match(src, /EXISTING_ID_RE/);
  const re = /^(\d{1,30}|rss_[a-f0-9]{24}|yt_[a-zA-Z0-9_-]{11})$/i;
  assert.equal(re.test("yt_7O1n1lHSjPM"), true);
  assert.equal(re.test("rss_aaaaaaaaaaaaaaaaaaaaaaaa"), true);
  assert.equal(re.test("1234567890123456789"), true);
  assert.equal(re.test("yt_short"), false);
  assert.equal(re.test("bad_id"), false);
  console.log("accepts yt_");
});

test("youtube-ingest uses existingIds for dedupe", () => {
  const ingest = readFileSync(join(root, "src/lib/news/youtube-ingest.ts"), "utf8");
  assert.match(ingest, /existingIds/);
  assert.match(ingest, /knownIds/);
});
