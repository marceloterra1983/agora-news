import assert from "node:assert/strict";
import test from "node:test";
import {
  CLUSTER_JACCARD,
  CLUSTER_WINDOW_MS,
  attachClusterChrome,
  canonicalUrl,
  clusterStories,
  jaccard,
} from "../src/lib/news/story-cluster.mjs";

function story(partial) {
  return {
    id: "1",
    title: "OpenAI lanca modelo GPT novo hoje",
    excerpt: "",
    body: "",
    original: "",
    url: "https://example.com/a",
    image: null,
    publishedAt: "2026-08-25T12:00:00.000Z",
    source: "openai",
    sourceLabel: "@openai",
    category: "ai",
    media: "Nenhuma",
    batch: "t",
    ...partial,
  };
}

test("near titles within 4h and same section become one cluster", () => {
  const a = story({
    id: "new",
    publishedAt: "2026-08-25T12:20:00.000Z",
    source: "openai",
  });
  const b = story({
    id: "old",
    title: "OpenAI lanca modelo GPT novo em demo",
    publishedAt: "2026-08-25T12:00:00.000Z",
    source: "sama",
    sourceLabel: "@sama",
  });
  assert.ok(jaccard(a.title, b.title) >= CLUSTER_JACCARD);
  const clusters = clusterStories([a, b]);
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0].members.length, 2);
  assert.equal(clusters[0].id, "old");
});

test("same canonical URL with UTM collapses", () => {
  assert.equal(
    canonicalUrl("https://www.theverge.com/story?utm_source=x&utm_medium=social"),
    canonicalUrl("https://theverge.com/story"),
  );
  const clusters = clusterStories([
    story({
      id: "a",
      title: "Um titulo qualquer sem overlap",
      url: "https://www.theverge.com/story?utm_source=x",
      source: "verge",
    }),
    story({
      id: "b",
      title: "Outro titulo totalmente diferente mesmo",
      url: "https://theverge.com/story",
      source: "wired",
      publishedAt: "2026-08-25T12:10:00.000Z",
    }),
  ]);
  assert.equal(clusters.length, 1);
});

test("same title 5h apart stays two clusters", () => {
  const gap = CLUSTER_WINDOW_MS + 60_000;
  const later = new Date(Date.parse("2026-08-25T12:00:00.000Z") + gap).toISOString();
  const clusters = clusterStories([
    story({ id: "a", publishedAt: later }),
    story({ id: "b", publishedAt: "2026-08-25T12:00:00.000Z" }),
  ]);
  assert.equal(clusters.length, 2);
});

test("ai and brasil never merge", () => {
  const clusters = clusterStories([
    story({ id: "a", category: "ai" }),
    story({ id: "b", category: "brasil", source: "folha" }),
  ]);
  assert.equal(clusters.length, 2);
});

test("cluster id stays the oldest member when a newer one arrives", () => {
  const first = clusterStories([
    story({ id: "old", publishedAt: "2026-08-25T12:00:00.000Z" }),
    story({ id: "mid", publishedAt: "2026-08-25T13:00:00.000Z" }),
  ]);
  const again = clusterStories([
    ...first[0].members,
    story({ id: "new", publishedAt: "2026-08-25T14:00:00.000Z" }),
  ]);
  assert.equal(first[0].id, "old");
  assert.equal(again[0].id, "old");
});

test("empty and singleton", () => {
  assert.deepEqual(clusterStories([]), []);
  const one = clusterStories([story({ id: "only" })]);
  assert.equal(one.length, 1);
  assert.equal(one[0].id, "only");
});

test("attachClusterChrome drops outsiders after catalog filter", () => {
  const listed = attachClusterChrome([
    story({
      id: "in",
      title: "OpenAI lanca modelo GPT novo hoje",
      source: "openai",
    }),
    story({
      id: "also",
      title: "OpenAI lanca modelo GPT novo em demo",
      source: "sama",
      sourceLabel: "@sama",
      publishedAt: "2026-08-25T12:10:00.000Z",
    }),
  ]);
  assert.equal(listed.length, 1);
  assert.equal(listed[0].memberIds.length, 2);
  assert.deepEqual(
    listed[0].alsoFrom.map((row) => row.source).sort(),
    ["openai", "sama"].filter((h) => h !== listed[0].source).sort(),
  );
  assert.equal(
    listed[0].alsoFrom.some((row) => /renan/i.test(row.source)),
    false,
  );
});
