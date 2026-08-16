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
  assert.match(src, /fillMissingLastPosts/);
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

test("empty Fontes card does not claim the gap is 48 hours", () => {
  const src = read("src/components/news/fontes-profile-row.tsx");
  assert.doesNotMatch(src, /últimas 48 horas/);
  assert.match(src, /Nenhum post encontrado/);
});
