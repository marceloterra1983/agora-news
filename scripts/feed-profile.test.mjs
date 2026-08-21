import assert from "node:assert/strict";
import test from "node:test";
import {
  fallbackFonteRow,
  feedHandle,
  fillMissingLastPosts,
  findFonteRow,
  lastPostsFromStories,
  resolveFeedProfileRow,
} from "../src/lib/news/feed-profile.mjs";

test("feedHandle strips @ and lowercases", () => {
  assert.equal(feedHandle("@LeeRob"), "leerob");
  assert.equal(feedHandle("  Cursor  "), "cursor");
});

test("findFonteRow matches the handle ignoring case", () => {
  const rows = [
    fallbackFonteRow({ handle: "leerob", name: "Lee", group: "devs" }),
    fallbackFonteRow({ handle: "gdb", name: "Greg" }),
  ];
  assert.equal(findFonteRow(rows, "@LeeRob")?.name, "Lee");
  assert.equal(findFonteRow(rows, "missing"), null);
});

test("lastPostsFromStories keeps only that handle and points to /materia/", () => {
  const posts = lastPostsFromStories(
    [
      { id: "a1", source: "@LeeRob", title: "Grok Bot", publishedAt: "2026-08-21T12:00:00.000Z" },
      { id: "b1", source: "gdb", title: "outro", publishedAt: "2026-08-21T11:00:00.000Z" },
      { id: "a1", source: "leerob", title: "dup", publishedAt: "2026-08-21T10:00:00.000Z" },
    ],
    "leerob",
  );
  assert.deepEqual(
    posts.map((p) => p.id),
    ["a1"],
  );
  assert.equal(posts[0].href, "/materia/a1");
  assert.equal(posts[0].title, "Grok Bot");
});

test("resolveFeedProfileRow prefers Fontes posts and fills from the feed when empty", () => {
  const fontes = {
    ...fallbackFonteRow({ handle: "leerob", name: "Lee", group: "devs" }),
    lastPosts: [
      {
        id: "x1",
        href: "https://x.com/leerob/status/x1",
        title: "do perfil",
        publishedAt: "2026-08-20T00:00:00.000Z",
      },
    ],
  };
  const stories = [
    { id: "a1", source: "leerob", title: "do feed", publishedAt: "2026-08-21T12:00:00.000Z" },
  ];
  assert.equal(
    resolveFeedProfileRow({ handle: "leerob", rows: [fontes], stories }).lastPosts[0].id,
    "x1",
  );
  const empty = fallbackFonteRow({ handle: "leerob", name: "Lee" });
  const filled = fillMissingLastPosts(empty, lastPostsFromStories(stories, "leerob"));
  assert.equal(filled.lastPosts[0].id, "a1");
  const fromFallback = resolveFeedProfileRow({
    handle: "leerob",
    rows: [],
    stories,
    fallback: empty,
  });
  assert.equal(fromFallback?.name, "Lee");
  assert.equal(fromFallback?.lastPosts[0].id, "a1");
});
