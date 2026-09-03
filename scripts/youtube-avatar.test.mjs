import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { youtubeAvatarFor, YOUTUBE_SEED } from "../src/lib/news/youtube-catalog.mjs";
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

  // All 26 channels have avatars
  for (const c of YOUTUBE_SEED) {
    const avatar = youtubeAvatarFor(c.account);
    assert.ok(avatar, `Canal ${c.title} deve ter avatar`);
    assert.match(avatar, /yt3\.googleusercontent\.com/, `Avatar de ${c.title} deve vir de googleusercontent`);
  }
});

test("resolveFace resolves YouTube avatar for channel sources", () => {
  const openAiFace = youtubeAvatarFor("y_bdebf4a1823d");
  const face = resolveFace(null, openAiFace);
  assert.equal(face, openAiFace);
  assert.notEqual(face, "");
});

test("supabase, story-card and article-view wire youtubeAvatarFor", () => {
  assert.match(read("src/lib/news/supabase.ts"), /youtubeAvatarFor\(source\)/);
  assert.match(read("src/components/news/story-card.tsx"), /youtubeAvatarFor\(story\.source\)/);
  assert.match(read("src/components/news/article-view.tsx"), /youtubeAvatarFor\(story\.source\)/);
  assert.match(read("src/lib/news/story-hydrate.ts"), /youtubeAvatarFor\(s\.source\)/);
});
