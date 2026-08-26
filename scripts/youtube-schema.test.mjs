import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sql = readFileSync(join(root, "scripts/supabase-youtube-tables.sql"), "utf8");

test("SQL creates youtube_channels table", () => {
  assert.match(sql, /create table if not exists public\.youtube_channels/i);
  assert.match(sql, /channel_id text primary key/i);
  assert.match(sql, /handle text not null/i);
  assert.match(sql, /name text not null/i);
  assert.match(sql, /avatar_url text/i);
  assert.match(sql, /enabled boolean not null default true/i);
  assert.match(sql, /updated_at timestamptz not null default now\(\)/i);
});

test("SQL creates youtube_videos table", () => {
  assert.match(sql, /create table if not exists public\.youtube_videos/i);
  assert.match(sql, /video_id text primary key/i);
  assert.match(sql, /channel_id text not null/i);
  assert.match(sql, /title text not null/i);
  assert.match(sql, /headline text not null/i);
  assert.match(sql, /summary_pt text not null/i);
  assert.match(sql, /watch_url text not null/i);
  assert.match(sql, /thumbnail_url text not null/i);
  assert.match(sql, /published_at timestamptz not null/i);
  assert.match(sql, /duration_seconds integer/i);
  assert.match(sql, /was_live boolean not null default false/i);
  assert.match(sql, /caption_status text not null/i);
  assert.match(sql, /created_at timestamptz not null default now\(\)/i);
});

test("SQL creates foreign key constraint", () => {
  assert.match(sql, /youtube_videos_channel_fk/i);
  assert.match(sql, /foreign key \(channel_id\) references public\.youtube_channels\(channel_id\)/i);
});

test("SQL creates indexes", () => {
  assert.match(sql, /create index if not exists youtube_videos_published_at_idx/i);
  assert.match(sql, /on public\.youtube_videos \(published_at desc\)/i);
  assert.match(sql, /create index if not exists youtube_videos_channel_published_idx/i);
  assert.match(sql, /on public\.youtube_videos \(channel_id, published_at desc\)/i);
});

test("SQL enables and forces RLS", () => {
  assert.match(sql, /alter table public\.youtube_channels enable row level security/i);
  assert.match(sql, /alter table public\.youtube_videos enable row level security/i);
  assert.match(sql, /alter table public\.youtube_channels force row level security/i);
  assert.match(sql, /alter table public\.youtube_videos force row level security/i);
});

test("SQL revokes anon/authenticated and grants service_role", () => {
  assert.match(sql, /revoke all on public\.youtube_channels from public, anon, authenticated/i);
  assert.match(sql, /revoke all on public\.youtube_videos from public, anon, authenticated/i);
  assert.match(sql, /grant all on public\.youtube_channels to service_role/i);
  assert.match(sql, /grant all on public\.youtube_videos to service_role/i);
});

test("SQL is idempotent (if not exists)", () => {
  assert.match(sql, /create table if not exists/gi);
  assert.match(sql, /create index if not exists/gi);
});

test("SQL drops old policies", () => {
  assert.match(sql, /drop policy if exists/i);
  assert.match(sql, /tablename in \('youtube_channels', 'youtube_videos'\)/i);
});

test("SQL wraps in transaction", () => {
  assert.match(sql, /^begin;/im);
  assert.match(sql, /commit;$/im);
});
