import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

test("push writes use only the private push_subscriptions table", () => {
  const src = read("src/lib/news/push-server.ts");
  assert.doesNotMatch(src, /category:\s*["']push["']/);
  assert.doesNotMatch(src, /cloudKv(Set|ListPrefix)/);
  assert.doesNotMatch(src, /listLegacyPushPosts/);
  assert.match(src, /adminHeaders/);
  assert.match(src, /push_subscriptions/);
  assert.ok(existsSync(join(root, "scripts/supabase-domain-tables.sql")));
  const sql = read("scripts/supabase-domain-tables.sql");
  assert.match(sql, /create table if not exists public\.push_subscriptions/);
  assert.match(sql, /NÃO vai em migrations/);
  assert.match(
    sql,
    /revoke all on public\.push_subscriptions from public, anon, authenticated/,
  );
});

test("CloudPrefs snapshot and type include groups and customGroups", () => {
  const server = read("src/lib/news/prefs-server.ts");
  const sync = read("src/lib/news/prefs-sync.ts");
  assert.match(server, /groups\?:/);
  assert.match(server, /customGroups\?:/);
  assert.match(server, /bySection\?:/);
  assert.match(server, /rssFeeds\?:/);
  assert.match(sync, /getGroupOverrides/);
  assert.match(sync, /loadCustomGroups/);
  assert.match(sync, /setGroupOverrides|replaceCustomGroups/);
  assert.match(sync, /bySection/);
  assert.match(sync, /loadRssFeeds/);
  assert.match(sync, /rssFeeds:/);
});

test("Fontes reads the store; catalog enrichment runs only on ingest", () => {
  const server = read("src/lib/news/server-fontes.ts");
  assert.match(server, /loadFontesFast/);
  assert.doesNotMatch(server, /loadFontesLive|enrichFontes/);
  assert.match(read("src/lib/news/ingest.ts"), /enrichFontesCatalog/);
});

test("summarizeProfile spends the LLM key only when spendKeyAllowed", () => {
  const src = read("src/lib/news/server-profile.ts");
  assert.match(src, /spendKeyAllowed/);
  assert.match(src, /userIdFromHeaders/);
});

test("mapPool is defined once and reused", () => {
  const pool = read("src/lib/news/map-pool.ts");
  assert.match(pool, /export async function mapPool/);
  const influence = read("src/lib/news/influence.ts");
  const ingest = read("src/lib/news/ingest.ts");
  assert.match(influence, /from ["'].\/map-pool["']/);
  assert.match(ingest, /from ["'].\/map-pool["']/);
  assert.doesNotMatch(influence, /async function mapPool/);
  assert.doesNotMatch(ingest, /async function mapPool/);
});

test("readStoredProfile uses storedProfileFromRow and does not require summary_pt", () => {
  const src = read("src/lib/news/profile-store.ts");
  assert.match(src, /storedProfileFromRow/);
  assert.doesNotMatch(src, /rows\[0\]\?\.summary_pt/);
  assert.doesNotMatch(src, /if \(!row\?\.summary_pt\) return null/);
});

test("card hrefs go through safeHttpHref", () => {
  assert.match(read("src/components/news/quote-card.tsx"), /safeHttpHref/);
  assert.match(read("src/components/news/article-view.tsx"), /safeHttpHref/);
  assert.match(read("src/components/news/fontes-profile-row.tsx"), /safeHttpHref/);
  assert.match(read("src/lib/news/x-media.ts"), /safeHttpHref/);
});
