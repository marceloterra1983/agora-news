import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const supabaseTs = readFileSync(join(root, "src/lib/news/supabase.ts"), "utf8");
const serverNewsTs = readFileSync(join(root, "src/lib/news/server-news.ts"), "utf8");

test("supabase.ts LIST_SELECT does not include youtube columns", () => {
  const listMatch = supabaseTs.match(/const LIST_SELECT\s*=\s*["'`]([^"'`]+)["'`]/);
  assert(listMatch, "LIST_SELECT not found");
  const fields = listMatch[1];
  assert.doesNotMatch(fields, /youtube/i);
  assert.doesNotMatch(fields, /video_id/);
  assert.doesNotMatch(fields, /channel_id/);
});

test("supabase.ts FULL_SELECT does not include youtube columns", () => {
  const fullMatch = supabaseTs.match(/const FULL_SELECT\s*=\s*["'`]([^"'`]+)["'`]/);
  assert(fullMatch, "FULL_SELECT not found");
  const fields = fullMatch[1];
  assert.doesNotMatch(fields, /youtube/i);
  assert.doesNotMatch(fields, /video_id/);
  assert.doesNotMatch(fields, /channel_id/);
});

test("supabase.ts SUPABASE_POSTS_URL points to posts table only", () => {
  assert.match(supabaseTs, /SUPABASE_POSTS_URL.*\/rest\/v1\/posts["'`]/);
  assert.doesNotMatch(supabaseTs, /SUPABASE_POSTS_URL.*youtube/i);
});

test("server-news.ts does not import youtube modules", () => {
  assert.doesNotMatch(serverNewsTs, /from.*youtube/i);
  assert.doesNotMatch(serverNewsTs, /import.*youtube/i);
});

test("feed route does not query youtube_videos", () => {
  const indexRoute = readFileSync(join(root, "src/routes/index.tsx"), "utf8");
  assert.doesNotMatch(indexRoute, /youtube_videos/i);
  assert.doesNotMatch(indexRoute, /loadVideo/i);
});

test("youtube tables are separate from posts", () => {
  const youtubeSql = readFileSync(
    join(root, "scripts/supabase-youtube-tables.sql"),
    "utf8",
  );
  assert.match(youtubeSql, /create table if not exists public\.youtube_channels/i);
  assert.match(youtubeSql, /create table if not exists public\.youtube_videos/i);
  assert.doesNotMatch(youtubeSql, /create table.*posts/i);
  assert.doesNotMatch(youtubeSql, /alter table.*posts/i);
});
