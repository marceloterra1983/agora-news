import assert from "node:assert/strict";
import test from "node:test";
import {
  isYouTubeAccount,
  isYouTubePostId,
  youtubeAccountId,
  youtubePostId,
} from "../src/lib/news/rss-id.mjs";
import {
  displaySourceAt,
  displaySourceByline,
  storyIsYouTube,
  storySourceFromAccount,
  originsInHandles,
} from "../src/lib/news/rss-catalog.mjs";
import { lastPostHref } from "../src/lib/news/last-post-core.mjs";

test("identifies YouTube accounts and post IDs", () => {
  const account = youtubeAccountId("UCXZCJLdBC09xxGZ6gcdrc6A");
  assert.match(account, /^y_[a-f0-9]{12}$/);
  assert.equal(isYouTubeAccount(account), true);
  assert.equal(isYouTubeAccount("openai"), false);
  assert.equal(isYouTubeAccount("r_bea4293d5edd"), false);

  const postId = youtubePostId("dQw4w9WgXcQ");
  assert.equal(postId, "yt_dQw4w9WgXcQ");
  assert.equal(isYouTubePostId(postId), true);
  assert.equal(isYouTubePostId("rss_deadbeef"), false);
  assert.equal(isYouTubePostId("182390123"), false);
});

test("storyIsYouTube detects YouTube sources and post IDs", () => {
  assert.equal(storyIsYouTube({ id: "yt_12345678901", source: "y_abcdef123456" }), true);
  assert.equal(storyIsYouTube({ id: "123", source: "y_abcdef123456" }), true);
  assert.equal(storyIsYouTube({ id: "yt_12345678901", source: "other" }), true);
  assert.equal(storyIsYouTube({ id: "123", source: "openai" }), false);
  assert.equal(storyIsYouTube({ id: "rss_123", source: "r_123456789012" }), false);
});

test("storySourceFromAccount never prepends @ to YouTube channels", () => {
  const ytAccount = "y_abcdef123456";
  const res = storySourceFromAccount(ytAccount, {
    title: "OpenAI",
    source: "youtube",
    postUrl: "https://www.youtube.com/watch?v=123",
  });
  assert.equal(res.source, ytAccount);
  assert.equal(res.sourceLabel, "OpenAI");

  const byline = displaySourceByline(ytAccount, "OpenAI");
  assert.equal(byline, "OpenAI");
  assert.doesNotMatch(byline, /^@/);

  const at = displaySourceAt(ytAccount);
  assert.equal(at, "");
});

test("originsInHandles detects x, rss and youtube", () => {
  assert.deepEqual(originsInHandles(["y_abcdef123456"]), ["youtube"]);
  assert.deepEqual(originsInHandles(["openai", "y_abcdef123456"]), ["x", "youtube"]);
  assert.deepEqual(originsInHandles(["openai", "r_123456789012", "y_abcdef123456"]), ["x", "rss", "youtube"]);
});

test("lastPostHref routes YouTube posts to in-app materia", () => {
  assert.equal(lastPostHref("y_abcdef123456", "yt_dQw4w9WgXcQ", false), "/materia/yt_dQw4w9WgXcQ");
  assert.equal(lastPostHref("y_abcdef123456", "", false), "");
});
