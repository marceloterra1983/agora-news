import assert from "node:assert/strict";
import test from "node:test";
import { storedProfileFromRow } from "../src/lib/news/profile-store-core.mjs";

test("storedProfileFromRow accepts a handle even without summary_pt", () => {
  const row = storedProfileFromRow({
    handle: "OpenAI",
    name: "OpenAI",
    bio: "research",
    avatar: "https://img.example/a.jpg",
    followers: 10,
    updated_at: "2026-01-01T00:00:00.000Z",
  });
  assert.equal(row?.handle, "OpenAI");
  assert.equal(row?.summary_pt, "");
  assert.equal(row?.name, "OpenAI");
  assert.equal(row?.followers, 10);
});

test("storedProfileFromRow maps posts fallback columns and rejects empty handle", () => {
  const row = storedProfileFromRow(
    {
      account: "@Ada",
      content: "bio",
      translation_pt: "Ada Lovelace",
      image_url: "https://img.example/b.jpg",
      media_label: "42",
      posted_at: "2026-02-01T00:00:00.000Z",
    },
    "",
  );
  assert.equal(row?.handle, "Ada");
  assert.equal(row?.name, "Ada Lovelace");
  assert.equal(row?.bio, "bio");
  assert.equal(row?.followers, 42);
  assert.equal(storedProfileFromRow({ summary_pt: "x" }), null);
  assert.equal(storedProfileFromRow(null), null);
});
