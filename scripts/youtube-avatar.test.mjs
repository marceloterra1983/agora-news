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
  const maestrosFace = youtubeAvatarFor("y_7bf15e60ce27");
  assert.ok(maestrosFace);
  assert.match(maestrosFace, /yt3\.googleusercontent\.com/);

  const quantFace = youtubeAvatarFor("y_c2559941c3af");
  assert.ok(quantFace);
  assert.match(quantFace, /yt3\.googleusercontent\.com/);

  assert.ok(YOUTUBE_SEED.length >= 30, `seed curto: ${YOUTUBE_SEED.length}`);
  assert.ok(
    YOUTUBE_SEED.some((c) => c.title === "Maestros da IA"),
    "seed deve incluir canal top de IA do watch-history",
  );
  assert.ok(
    YOUTUBE_SEED.some((c) => c.title === "Rafael Quintanilha – QuantBrasil"),
    "seed deve incluir canal long-form de IA do watch-history",
  );
  assert.ok(
    YOUTUBE_SEED.some((c) => c.title === "PrimosAgro"),
    "seed deve incluir canal top de economia/agro do watch-history",
  );
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

test("watch-ranked channels have distinct live avatar URLs", () => {
  const maestros = YOUTUBE_SEED.find((c) => c.title === "Maestros da IA");
  const primos = YOUTUBE_SEED.find((c) => c.title === "PrimosAgro");
  assert.ok(maestros?.avatar);
  assert.ok(primos?.avatar);
  assert.notEqual(maestros.avatar, primos.avatar);
});

test("resolveFace prefers catalog YouTube avatar over dead story URL", () => {
  const catalog = youtubeAvatarFor("y_7bf15e60ce27");
  const dead = "https://yt3.googleusercontent.com/15Akj76BG8IsM5ctgqVwKXArl6IfIVFAbuGaUq-I=s900-c-k-c0x00ffffff-no-rj";
  const face = resolveFace(catalog || null, dead);
  assert.equal(face, catalog);
  assert.notEqual(face, dead);
  console.log("catalog preferred");
});

test("mergeYouTubeFontes overwrites stale avatar from cache/DB", () => {
  const account = "y_7bf15e60ce27";
  const fresh = youtubeAvatarFor(account);
  const stale =
    "https://yt3.googleusercontent.com/ytc/AIdro_ljAkSpv16cJNUsE_rI1X-Kz9s7Z5aC7c9A=s900-c-k-c0x00ffffff-no-rj";
  const merged = mergeYouTubeFontes(
    [{ handle: account, name: "Maestros da IA", group: "builders", avatar: stale }],
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
