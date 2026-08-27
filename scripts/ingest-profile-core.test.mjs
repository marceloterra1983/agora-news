import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ownedAuthorFromStatuses,
  profileFieldsFromAuthor,
  statusesOwnedByHandle,
} from "../src/lib/news/ingest-profile-core.mjs";
import { withAvatars } from "../src/lib/news/profile-store-core.mjs";

const GREG =
  "https://pbs.twimg.com/profile_images/1347621377503711233/bHg3ipfD_400x400.jpg";
const GREG_200 =
  "https://pbs.twimg.com/profile_images/1347621377503711233/bHg3ipfD_200x200.jpg";
const OPENAI_FACE =
  "https://pbs.twimg.com/profile_images/1885410181409820672/ztsaR0JW_normal.jpg";

const gdbAuthor = {
  screen_name: "gdb",
  name: "Greg Brockman",
  description: "President & Co-Founder @OpenAI",
  avatar_url: GREG_200,
  followers: 1_037_074,
};
const openaiAuthor = {
  screen_name: "OpenAI",
  name: "OpenAI",
  description: "AGI for humanity",
  avatar_url: OPENAI_FACE,
  followers: 5_129_352,
};
const chatgptAuthor = {
  screen_name: "ChatGPT",
  name: "ChatGPT",
  description: "ChatGPT is for the people.",
  avatar_url: "https://pbs.twimg.com/profile_images/9/cg_200x200.jpg",
  followers: 650_927,
};

const mixedOpenAiTimeline = [
  { id: "1", text: "open letter", author: gdbAuthor },
  { id: "2", text: "hugging face incident", author: openaiAuthor },
  { id: "3", text: "reply", author: openaiAuthor, replying_to: "2" },
  { id: "4", text: "work can now use", author: chatgptAuthor },
];

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

test("ownedAuthorFromStatuses skips foreign timeline faces", () => {
  const author = ownedAuthorFromStatuses("OpenAI", mixedOpenAiTimeline);
  assert.equal(author?.screen_name, "OpenAI");
  assert.match(author?.avatar_url || "", /ztsaR0JW/);
  assert.equal(ownedAuthorFromStatuses("OpenAI", [mixedOpenAiTimeline[0]]), null);
  assert.deepEqual(
    statusesOwnedByHandle("OpenAI", mixedOpenAiTimeline).map((t) => t.id),
    ["2", "3"],
  );
});

test("profileFieldsFromAuthor evicts a stolen prev that copies the foreign face", () => {
  const openai = profileFieldsFromAuthor("OpenAI", gdbAuthor, {
    name: "OpenAI",
    bio: "President & Co-Founder @OpenAI",
    avatar: GREG,
    followers: 1_037_071,
  });
  assert.equal(openai.avatar, null);
  assert.equal(openai.bio, "");
  assert.equal(openai.followers, 0);
  assert.equal(openai.name, "OpenAI");
});

test("owned OpenAI author heals a profile that still has Greg's face", () => {
  const openai = profileFieldsFromAuthor("OpenAI", openaiAuthor, {
    name: "OpenAI",
    bio: "President & Co-Founder @OpenAI",
    avatar: GREG,
    followers: 1_037_071,
  });
  assert.match(openai.avatar || "", /ztsaR0JW_400x400/);
  assert.equal(openai.bio, "AGI for humanity");
  assert.equal(openai.followers, 5_129_352);
});

test("ingest persists profile face only through owned author fields", () => {
  const source = readFileSync(
    new URL("../src/lib/news/ingest.ts", import.meta.url),
    "utf8",
  );
  const persist = readFileSync(
    new URL("../src/lib/news/profile-last-store.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /ownedAuthorFromStatuses/);
  assert.match(source, /profileFieldsFromAuthor/);
  assert.match(source, /statusesOwnedByHandle/);
  assert.doesNotMatch(source, /last\?\.author/);
  assert.doesNotMatch(source, /author\?\.avatar_url/);
  assert.match(persist, /profileFieldsFromAuthor/);
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
