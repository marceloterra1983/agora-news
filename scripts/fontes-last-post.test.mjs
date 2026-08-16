import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

test("keepLastPost never replaces a stored tweet with null", () => {
  const src = read("src/lib/news/last-post.ts");
  assert.match(src, /export function keepLastPost/);
  assert.match(src, /if \(!next\) return prev/);
});

test("listStoredProfiles reads last_post from x_profiles", () => {
  const src = read("src/lib/news/profile-store.ts");
  assert.match(src, /x_profiles\?select=[^"'`]*last_post/);
  assert.match(src, /parseLastPost/);
});

test("Fontes lastPost falls back to stored last_post, not only the recent feed window", () => {
  const src = read("src/lib/news/influence.ts");
  assert.match(src, /storedLast|lastFromStore|keepLastPost|preferNewerLast/);
  assert.doesNotMatch(src, /fillMissingLastPosts/);
});

test("last-post fill runs on ingest cron, not on Fontes GET", () => {
  const ingest = read("src/lib/news/ingest.ts");
  const live = read("src/lib/news/influence.ts");
  assert.match(ingest, /fillMissingLastPosts|fillCatalogGaps/);
  assert.doesNotMatch(live, /fillMissingLastPosts|fillCatalogGaps/);
});

test("Fontes last-post link uses in-app materia only when the tweet is in the feed", () => {
  const href = read("src/lib/news/last-post.ts");
  const row = read("src/components/news/fontes-profile-row.tsx");
  assert.match(href, /export function lastPostHref/);
  assert.match(href, /\/materia\//);
  assert.match(href, /https:\/\/x\.com\//);
  assert.match(row, /lastPost\.href|lastPostHref/);
});

test("ingest cron script sends Bearer to local PM2", () => {
  const src = read("scripts/ingest-cron.sh");
  assert.match(src, /CRON_SECRET/);
  assert.match(src, /Bearer/);
  assert.match(src, /3080\/api\/ingest/);
});

test("ingest keeps the previous last_post when the current batch has no tweet", () => {
  const src = read("src/lib/news/ingest.ts");
  assert.match(src, /keepLastPost/);
  assert.doesNotMatch(src, /last_post:\s*last\?\.id\s*\?/);
});

test("profile and watch writes preserve last_post instead of wiping it", () => {
  const profile = read("src/routes/api/profile.ts");
  const watch = read("src/routes/api/watch.ts");
  assert.match(profile, /keepLastPost|prev\?\.last_post|lastPost/);
  assert.match(watch, /keepLastPost|lastPost|last_post:/);
  assert.doesNotMatch(profile, /last_post:\s*null/);
});

test("last posts persist in posts category x-last when x_profiles is absent", () => {
  const src = read("src/lib/news/last-post.ts");
  const store = read("src/lib/news/last-post-store.ts");
  assert.match(src, /export const LAST_POST_CATEGORY = "x-last"/);
  assert.match(store, /export async function listXLastPosts/);
  assert.match(store, /category:\s*LAST_POST_CATEGORY/);
  assert.match(src, /account", `eq\./);
  assert.doesNotMatch(src, /ilike\.\$\{/);
  assert.doesNotMatch(src, /new Date\(\)\.toISOString\(\)/);
  assert.match(store, /fillMissingLastPosts/);
  assert.match(store, /\.slice\(0,\s*80\)/);
});

test("Fontes feed last-map merges x-last and does not stop at 120 rows", () => {
  const src = read("src/lib/news/influence.ts");
  assert.match(src, /listXLastPosts/);
  assert.match(src, /"1000"/);
});

test("empty Fontes card does not claim the gap is 48 hours", () => {
  const src = read("src/components/news/fontes-profile-row.tsx");
  assert.doesNotMatch(src, /últimas 48 horas/);
  assert.match(src, /Nenhum post encontrado/);
});
