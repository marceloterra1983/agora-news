import assert from "node:assert/strict";
import test from "node:test";
import {
  keepLastPost,
  lastPostHref,
  parseLastPost,
  preferNewerLast,
  safeHttpHref,
  storedToLastHit,
} from "../src/lib/news/last-post-core.mjs";

const older = {
  id: "1",
  text: "old tweet",
  url: "https://x.com/a/status/1",
  publishedAt: "2024-01-01T00:00:00.000Z",
};
const newer = {
  id: "2",
  text: "new tweet",
  url: "https://x.com/a/status/2",
  publishedAt: "2024-06-01T00:00:00.000Z",
};

test("keepLastPost keeps the stored tweet when next is null", () => {
  assert.deepEqual(keepLastPost(older, null), older);
  assert.deepEqual(keepLastPost(older, undefined), older);
  assert.equal(keepLastPost(null, null), null);
});

test("keepLastPost keeps prev when next is older or has an invalid date", () => {
  assert.deepEqual(keepLastPost(newer, older), newer);
  assert.deepEqual(keepLastPost(older, { ...newer, publishedAt: "not-a-date" }), older);
});

test("keepLastPost takes next when it is first or newer", () => {
  assert.deepEqual(keepLastPost(null, newer), newer);
  assert.deepEqual(keepLastPost(older, newer), newer);
});

test("lastPostHref uses in-app materia only when inApp and id are set", () => {
  assert.equal(lastPostHref("OpenAI", "123", true), "/materia/123");
  assert.equal(lastPostHref("@OpenAI", "123", false), "https://x.com/OpenAI/status/123");
  assert.equal(lastPostHref("@OpenAI", "", false), "https://x.com/OpenAI");
  assert.equal(lastPostHref("@OpenAI", "", true), "https://x.com/OpenAI");
});

test("lastPostHref for RSS never points at x.com", () => {
  assert.equal(lastPostHref("r_9c68d283ae03", "rss_aabb", false), "/materia/rss_aabb");
  assert.equal(lastPostHref("r_9c68d283ae03", "", false), "");
});

test("parseLastPost accepts title alias and rejects incomplete rows", () => {
  assert.equal(parseLastPost(null), null);
  assert.equal(parseLastPost({ id: "9" }), null);
  assert.deepEqual(parseLastPost({ id: "9", title: "  hi  there ", publishedAt: older.publishedAt }), {
    id: "9",
    text: "hi there",
    url: "https://x.com/i/status/9",
    publishedAt: older.publishedAt,
  });
});

test("safeHttpHref keeps http(s) and in-app paths, drops other schemes", () => {
  assert.equal(safeHttpHref("https://x.com/a/status/1"), "https://x.com/a/status/1");
  assert.equal(safeHttpHref("http://example.com/a"), "http://example.com/a");
  assert.equal(safeHttpHref("/materia/123"), "/materia/123");
  assert.equal(safeHttpHref("javascript:alert(1)"), "");
  assert.equal(safeHttpHref("data:text/html,x"), "");
  assert.equal(safeHttpHref("//evil.example/phish"), "");
  assert.equal(safeHttpHref("https://x.com/a/status/1", { allowPath: false }), "https://x.com/a/status/1");
  assert.equal(safeHttpHref("/materia/123", { allowPath: false }), "");
});

test("parseLastPost drops javascript urls", () => {
  const parsed = parseLastPost({
    id: "9",
    text: "hi",
    url: "javascript:alert(1)",
    publishedAt: older.publishedAt,
  });
  assert.equal(parsed?.url, "https://x.com/i/status/9");
});

test("preferNewerLast and storedToLastHit keep the newest stored tweet", () => {
  assert.deepEqual(preferNewerLast(older, newer), newer);
  assert.deepEqual(preferNewerLast(newer, older), newer);
  assert.equal(storedToLastHit(null), null);
  assert.deepEqual(storedToLastHit(newer), {
    id: "2",
    title: "new tweet",
    publishedAt: newer.publishedAt,
    count: 1,
  });
});
