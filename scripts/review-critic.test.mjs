import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

test("Fontes page does not refetch live after the store loader", () => {
  const src = read("src/routes/fontes.tsx");
  assert.doesNotMatch(src, /loadFontesLive/);
});

test("ProfileEr uses row.er and does not fan-out loadFonteMetrics", () => {
  const src = read("src/components/news/fontes-profile-er.tsx");
  assert.doesNotMatch(src, /loadFonteMetrics/);
  assert.doesNotMatch(read("src/lib/news/server-fontes.ts"), /loadFonteMetrics/);
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

test("buzz uses the shared cache instead of synthetic public posts", () => {
  assert.equal(existsSync(join(root, "src/lib/news/cloud-kv.ts")), false);
  const src = read("src/lib/news/fonte-buzz-store.ts");
  assert.match(src, /cacheGetJson/);
  assert.match(src, /cacheSetJson/);
  assert.doesNotMatch(src, /cloudKv|rest\/v1\/posts|upsertPosts/);
});
