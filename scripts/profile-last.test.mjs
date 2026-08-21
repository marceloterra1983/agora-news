import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  PROFILE_LAST_KEEP,
  PROFILE_LAST_PAGE,
  keepLastPosts,
  nextProfileShown,
  packLastPosts,
  unpackLastPosts,
  visibleProfilePosts,
} from "../src/lib/news/profile-last.mjs";
import { parseLastPost } from "../src/lib/news/last-post-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

function post(id, day) {
  return {
    id: String(id),
    text: `tweet ${id}`,
    url: `https://x.com/a/status/${id}`,
    publishedAt: `2026-01-${String(day).padStart(2, "0")}T00:00:00.000Z`,
  };
}

test("keepLastPosts keeps the newest 10 and drops duplicates", () => {
  const incoming = Array.from({ length: 14 }, (_, i) => post(i + 1, i + 1));
  const kept = keepLastPosts([post(3, 3), post(99, 20)], incoming);
  assert.equal(kept.length, PROFILE_LAST_KEEP);
  assert.equal(kept[0].id, "99");
  assert.equal(kept[1].id, "14");
  assert.equal(kept.at(-1).id, "6");
  assert.equal(new Set(kept.map((p) => p.id)).size, PROFILE_LAST_KEEP);
});

test("packLastPosts keeps parseLastPost on the newest and unpacks the rest", () => {
  const list = [post(2, 2), post(1, 1), post(3, 3)];
  const packed = packLastPosts(list);
  assert.equal(parseLastPost(packed)?.id, "3");
  assert.deepEqual(
    unpackLastPosts(packed).map((p) => p.id),
    ["3", "2", "1"],
  );
  assert.deepEqual(unpackLastPosts(post(7, 7)).map((p) => p.id), ["7"]);
  assert.deepEqual(unpackLastPosts(null), []);
});

test("Mais opens two more posts until the stored 10", () => {
  const posts = Array.from({ length: 10 }, (_, i) => post(10 - i, 10 - i));
  let shown = PROFILE_LAST_PAGE;
  assert.deepEqual(
    visibleProfilePosts(posts, shown).map((p) => p.id),
    ["10", "9"],
  );
  shown = nextProfileShown(shown, posts.length);
  assert.equal(shown, 4);
  assert.equal(visibleProfilePosts(posts, shown).length, 4);
  shown = nextProfileShown(8, 10);
  assert.equal(shown, 10);
  assert.equal(nextProfileShown(10, 10), 10);
  assert.equal(nextProfileShown(1, 3), 3);
});

test("ingest packs last_posts and Fontes opens them two at a time", () => {
  const ingest = read("src/lib/news/ingest.ts");
  const row = read("src/components/news/fonte-profile-card.tsx");
  const chip = read("src/components/news/fontes-last-posts.tsx");
  const live = read("src/lib/news/influence.ts");
  assert.match(ingest, /packLastPosts|keepLastPosts/);
  assert.match(ingest, /persistPackedLastPosts/);
  assert.match(live, /lastPosts/);
  assert.match(row, /FonteLastPosts/);
  assert.match(chip, /fonte-mais-posts/);
  assert.match(chip, /nextShownByHours/);
  assert.match(chip, /mais 12 horas/);
  assert.match(read("src/lib/news/ingest-fetch.ts"), /count=10/);
});

test("open card shows each post age and divides the action buttons", () => {
  const chip = read("src/components/news/fontes-last-posts.tsx");
  const row = read("src/components/news/fonte-profile-card.tsx");
  assert.match(chip, /relativeTime\(post\.publishedAt\)/);
  assert.match(chip, /<time\b[^>]*dateTime=\{post\.publishedAt\}/);
  assert.doesNotMatch(chip, /relativeTime\(visible\[0\]\.publishedAt\)/);
  const actions = row.slice(row.indexOf("data-fonte-actions"));
  assert.match(actions, /border-t/);
});
