import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  mergeYouTubeFontes,
  youtubeAvatarFor,
  YOUTUBE_SEED,
} from "../src/lib/news/youtube-catalog.mjs";
import { resolveFace } from "../src/lib/news/profile-store-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

test("youtubeAvatarFor returns valid avatar URLs for channels", () => {
  const openAiFace = youtubeAvatarFor("y_bdebf4a1823d");
  assert.ok(openAiFace);
  assert.match(openAiFace, /yt3\.googleusercontent\.com/);

  const anthropicFace = youtubeAvatarFor("y_b01b6db24262");
  assert.ok(anthropicFace);
  assert.match(anthropicFace, /yt3\.googleusercontent\.com/);

  assert.equal(YOUTUBE_SEED.length, 26);
  for (const c of YOUTUBE_SEED) {
    const avatar = youtubeAvatarFor(c.account);
    assert.ok(avatar, `Canal ${c.title} deve ter avatar`);
    assert.match(
      avatar,
      /yt3\.googleusercontent\.com/,
      `Avatar de ${c.title} deve vir de googleusercontent`,
    );
    // Hashes truncados históricos quebravam com HTTP 400 — exigir token longo.
    const token = avatar.replace(/^https:\/\/yt3\.googleusercontent\.com\//, "").split("=")[0];
    assert.ok(token.length >= 40, `Avatar de ${c.title} parece truncado (${token.length})`);
  }
});

test("Machine Learning Street Talk and Two Minute Papers have distinct live URLs", () => {
  const mlst = YOUTUBE_SEED.find((c) => c.title === "Machine Learning Street Talk");
  const tmp = YOUTUBE_SEED.find((c) => c.title === "Two Minute Papers");
  assert.ok(mlst?.avatar);
  assert.ok(tmp?.avatar);
  assert.notEqual(mlst.avatar, tmp.avatar);
  assert.match(mlst.avatar, /15Akj76BG8IsM5ctgqVwKXArl6IfIVFAbuGa1kOomoioRgJgXHHaLmMAW7iHTMRUoEfyjTtq8lg/);
  assert.match(tmp.avatar, /AIdro_ljAkSpv16cJNUsE_rI1X-Kz9s78w1WNojUga-aZ1uVzEQ/);
});

test("resolveFace prefers catalog YouTube avatar over dead story URL", () => {
  const catalog = youtubeAvatarFor("y_0765ad77052a");
  const dead = "https://yt3.googleusercontent.com/15Akj76BG8IsM5ctgqVwKXArl6IfIVFAbuGaUq-I=s900-c-k-c0x00ffffff-no-rj";
  const face = resolveFace(catalog || null, dead);
  assert.equal(face, catalog);
  assert.notEqual(face, dead);
  console.log("catalog preferred");
});

test("mergeYouTubeFontes overwrites stale avatar from cache/DB", () => {
  const account = "y_434c876fd910";
  const fresh = youtubeAvatarFor(account);
  const stale =
    "https://yt3.googleusercontent.com/ytc/AIdro_ljAkSpv16cJNUsE_rI1X-Kz9s7Z5aC7c9A=s900-c-k-c0x00ffffff-no-rj";
  const merged = mergeYouTubeFontes(
    [{ handle: account, name: "Two Minute Papers", group: "pesquisa", avatar: stale }],
    "ai",
  );
  const row = merged.find((r) => r.handle === account);
  assert.ok(row);
  assert.equal(row.avatar, fresh);
  assert.notEqual(row.avatar, stale);
});

test("supabase, story-card and article-view wire youtubeAvatarFor", () => {
  assert.match(read("src/lib/news/supabase.ts"), /youtubeAvatarFor\(source\)/);
  assert.match(read("src/components/news/story-card.tsx"), /youtubeAvatarFor\(story\.source\)/);
  assert.match(read("src/components/news/article-view.tsx"), /youtubeAvatarFor\(story\.source\)/);
  assert.match(read("src/lib/news/story-hydrate.ts"), /youtubeAvatarFor\(s\.source\)/);
});

test("avatar surfaces use SourceAvatar with onError + no-referrer", () => {
  const face = read("src/components/news/source-avatar.tsx");
  assert.match(face, /referrerPolicy=["']no-referrer["']/);
  assert.match(face, /onError=\{/);
  assert.match(face, /setBroken\(true\)/);

  for (const rel of [
    "src/components/news/story-card.tsx",
    "src/components/news/article-view.tsx",
    "src/components/news/feed-profile-popup.tsx",
    "src/components/news/fontes-profile-row.tsx",
  ]) {
    assert.match(read(rel), /SourceAvatar/, `${rel} deve usar SourceAvatar`);
  }
});
