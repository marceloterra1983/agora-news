import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { profileFieldsFromAuthor } from "../src/lib/news/ingest-profile-core.mjs";
import { withAvatars } from "../src/lib/news/profile-store-core.mjs";

const GREG =
  "https://pbs.twimg.com/profile_images/1347621377503711233/bHg3ipfD_400x400.jpg";

test("profileFieldsFromAuthor does not steal the previous timeline author's face", () => {
  const greg = profileFieldsFromAuthor("gdb", {
    screen_name: "gdb",
    name: "Greg Brockman",
    description: "President & Co-Founder @OpenAI",
    avatar_url: GREG,
    followers: 99,
  });
  const openai = profileFieldsFromAuthor(
    "OpenAI",
    {
      screen_name: "gdb",
      name: "Greg Brockman",
      description: "President & Co-Founder @OpenAI",
      avatar_url: GREG,
      followers: 99,
    },
    { name: "OpenAI", bio: "", avatar: null, followers: 0 },
  );
  assert.equal(greg.avatar, GREG);
  assert.equal(openai.avatar, null);
  assert.equal(openai.bio, "");
  assert.equal(openai.name, "OpenAI");
});

test("profileFieldsFromAuthor keeps the face when the author owns the handle", () => {
  const openai = profileFieldsFromAuthor("OpenAI", {
    screen_name: "OpenAI",
    name: "OpenAI",
    description: "AGI for humanity",
    avatar_url: "https://pbs.twimg.com/profile_images/2/oa_normal.jpg",
    followers: 10,
  });
  assert.equal(
    openai.avatar,
    "https://pbs.twimg.com/profile_images/2/oa_400x400.jpg",
  );
  assert.equal(openai.bio, "AGI for humanity");
});

test("ingest persists profile face only through owned author fields", () => {
  const source = readFileSync(
    new URL("../src/lib/news/ingest.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /profileFieldsFromAuthor/);
  assert.doesNotMatch(source, /author\?\.avatar_url/);
});

test("withAvatars does not paint the previous handle's face on the next story", () => {
  const painted = withAvatars(
    [
      { id: "4", source: "gdb", avatar: null },
      { id: "5", source: "OpenAI", avatar: null },
    ],
    new Map([["gdb", GREG]]),
  );
  assert.equal(painted[0].avatar, GREG);
  assert.equal(painted[1].avatar, null);
});
