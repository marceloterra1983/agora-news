import assert from "node:assert/strict";
import test from "node:test";
import { normalizeOrdem, rankStories } from "../src/lib/news/feed-rank.mjs";

function story(id, at, extra = {}) {
  return {
    id,
    title: id,
    publishedAt: at,
    source: extra.source || "openai",
    image: extra.image || null,
    alsoFrom: extra.alsoFrom || [],
  };
}

const now = Date.parse("2026-08-25T12:00:00.000Z");

test("normalizeOrdem falls back to recente", () => {
  assert.equal(normalizeOrdem("importante"), "importante");
  assert.equal(normalizeOrdem("nope"), "recente");
  assert.equal(normalizeOrdem(""), "recente");
});

test("recente is publishedAt desc and stable on tie", () => {
  const listed = rankStories(
    [
      story("b", "2026-08-25T10:00:00.000Z"),
      story("a", "2026-08-25T11:00:00.000Z"),
      story("c", "2026-08-25T11:00:00.000Z"),
    ],
    "recente",
  );
  assert.deepEqual(
    listed.map((row) => row.id),
    ["a", "c", "b"],
  );
});

test("seguindo lifts starred and watched first", () => {
  const listed = rankStories(
    [
      story("old-follow", "2026-08-25T08:00:00.000Z", { source: "sama" }),
      story("new", "2026-08-25T11:00:00.000Z", { source: "openai" }),
    ],
    "seguindo",
    { starred: ["sama"] },
  );
  assert.deepEqual(
    listed.map((row) => row.id),
    ["old-follow", "new"],
  );
});

test("importante scores cluster follow image and read penalty", () => {
  const listed = rankStories(
    [
      story("read-alone", "2026-08-25T11:50:00.000Z", { source: "openai" }),
      story("cluster", "2026-08-25T10:00:00.000Z", {
        source: "verge",
        alsoFrom: [{ source: "ars" }, { source: "hf" }],
        image: "https://x/a.jpg",
      }),
    ],
    "importante",
    {
      starred: ["verge"],
      read: ["read-alone"],
      hasBaseline: true,
      now,
    },
  );
  assert.equal(listed[0].id, "cluster");
});
