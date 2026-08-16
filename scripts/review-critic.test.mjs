import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { getProfileMetrics, seedBuzz } from "../src/lib/news/fonte-metrics.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

test("getProfileMetrics reads memory/store and never calls fxtwitter", () => {
  const src = read("src/lib/news/fonte-metrics.ts");
  const start = src.indexOf("export async function getProfileMetrics");
  const alt = src.indexOf("export function getProfileMetrics");
  const at = start >= 0 ? start : alt;
  assert.ok(at >= 0, "getProfileMetrics must exist");
  const fn = src.slice(at, at + 280);
  assert.match(fn, /buzzFor/);
  assert.doesNotMatch(fn, /fetchLastBuzz|fxtwitter/);
  seedBuzz("critic_handle", {
    likes: 1,
    views: 100,
    replies: 0,
    reposts: 0,
    quotes: 0,
    bookmarks: 0,
    er: 1,
    profileEr: 2.5,
  });
  assert.equal(getProfileMetrics("critic_handle").profileEr, 2.5);
  assert.equal(getProfileMetrics("missing_critic_handle").profileEr, 0);
});

test("Fontes page does not refetch live after the store loader", () => {
  const src = read("src/routes/fontes.tsx");
  assert.doesNotMatch(src, /loadFontesLive/);
});

test("ProfileEr uses row.er and does not fan-out loadFonteMetrics", () => {
  const src = read("src/components/news/fontes-profile-er.tsx");
  assert.doesNotMatch(src, /loadFonteMetrics/);
  assert.match(src, /fallback/);
});

test("push POST stores the session userId on the subscription", () => {
  const src = read("src/routes/api/push.ts");
  assert.match(src, /userIdFromHeaders/);
  assert.match(src, /userId,/);
});

test("ingest enriches the catalog once and persists buzz", () => {
  const src = read("src/lib/news/ingest.ts");
  assert.match(src, /enrichFontesCatalog|enrichAllFontes/);
  assert.match(src, /persistBuzzCache|persistFonteBuzz/);
  assert.doesNotMatch(src, /for \(const section of listKnownSections\(\)\) \{\s*const liveRows = await enrichFontes/);
});

test("cloud-kv reads use service-role, not the anon key", () => {
  const src = read("src/lib/news/cloud-kv.ts");
  assert.match(src, /adminHeaders\(\)/);
  const get = src.slice(src.indexOf("export async function cloudKvGet"), src.indexOf("export async function cloudKvSet"));
  assert.match(get, /adminHeaders\(\)/);
  assert.doesNotMatch(get, /headers: AUTH/);
});
