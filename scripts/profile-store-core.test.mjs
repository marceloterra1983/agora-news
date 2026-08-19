import assert from "node:assert/strict";
import test from "node:test";
import {
  avatarInFilter,
  displayAvatarUrl,
  mergeAvatarsIntoStories,
  resolveFace,
  storedProfileFromRow,
  withAvatars,
} from "../src/lib/news/profile-store-core.mjs";

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

test("displayAvatarUrl upgrades X thumbs to the original 400x400 face", () => {
  assert.equal(
    displayAvatarUrl("https://pbs.twimg.com/profile_images/1/ada_normal.jpg"),
    "https://pbs.twimg.com/profile_images/1/ada_400x400.jpg",
  );
  assert.equal(
    displayAvatarUrl("https://pbs.twimg.com/profile_images/1/ada_bigger.png"),
    "https://pbs.twimg.com/profile_images/1/ada_400x400.png",
  );
  assert.equal(
    displayAvatarUrl("https://pbs.twimg.com/profile_images/1/ada_400x400.jpg"),
    "https://pbs.twimg.com/profile_images/1/ada_400x400.jpg",
  );
  assert.equal(displayAvatarUrl("not-a-url"), null);
  assert.equal(displayAvatarUrl(""), null);
});

test("withAvatars paints the stored face and keeps an existing story avatar", () => {
  const painted = withAvatars(
    [
      { id: "1", source: "@Ada", avatar: null },
      {
        id: "2",
        source: "openai",
        avatar: "https://pbs.twimg.com/profile_images/2/oa_normal.jpg",
      },
      { id: "3", source: "missing", avatar: null },
    ],
    new Map([
      ["ada", "https://pbs.twimg.com/profile_images/1/ada_normal.jpg"],
      ["openai", "https://cdn.example/ignored.jpg"],
    ]),
  );
  assert.equal(painted[0].avatar, "https://pbs.twimg.com/profile_images/1/ada_400x400.jpg");
  assert.equal(painted[1].avatar, "https://pbs.twimg.com/profile_images/2/oa_400x400.jpg");
  assert.equal(painted[2].avatar, null);
});

test("avatarInFilter asks only the page handles, both casings", () => {
  assert.equal(avatarInFilter(["@GarryTan", "garrytan", ""]), `"GarryTan","garrytan"`);
  assert.equal(avatarInFilter(["bad handle!", ""]), "");
});

test("resolveFace prefers the story face the article already has", () => {
  assert.equal(
    resolveFace(
      "https://pbs.twimg.com/profile_images/1/dog_normal.jpg",
      "https://cdn.example/ignored.jpg",
    ),
    "https://pbs.twimg.com/profile_images/1/dog_400x400.jpg",
  );
  assert.equal(
    resolveFace(null, "https://pbs.twimg.com/profile_images/1/dog_normal.jpg"),
    "https://pbs.twimg.com/profile_images/1/dog_400x400.jpg",
  );
  assert.equal(resolveFace(null, null), "");
});

test("mergeAvatarsIntoStories keeps the face the article already hydrated", () => {
  const merged = mergeAvatarsIntoStories(
    [
      { id: "1", source: "garrytan", avatar: null },
      { id: "2", source: "garrytan", avatar: null },
    ],
    {
      1: {
        source: "garrytan",
        avatar: "https://pbs.twimg.com/profile_images/1/dog_normal.jpg",
      },
    },
  );
  assert.equal(merged[0].avatar, "https://pbs.twimg.com/profile_images/1/dog_400x400.jpg");
  assert.equal(merged[1].avatar, "https://pbs.twimg.com/profile_images/1/dog_400x400.jpg");
});
