import assert from "node:assert/strict";
import test from "node:test";
import { rankStories } from "../src/lib/news/feed-rank.mjs";

const story = (id, publishedAt) => ({ id, publishedAt });

test("feed ordena por data desc com desempate estável por id", () => {
  const list = [
    story("b", "2026-08-25T10:00:00Z"),
    story("c", "2026-08-25T12:00:00Z"),
    story("a", "2026-08-25T10:00:00Z"),
  ];
  assert.deepEqual(
    rankStories(list).map((s) => s.id),
    ["c", "a", "b"],
  );
});

test("datas inválidas não quebram e entrada não-array vira lista vazia", () => {
  const list = [story("x", "invalida"), story("y", "2026-08-25T09:00:00Z")];
  assert.equal(rankStories(list).length, 2);
  assert.deepEqual(rankStories(undefined), []);
  assert.deepEqual(rankStories(null), []);
});

test("não muta a lista original", () => {
  const list = [story("b", "2026-08-25T10:00:00Z"), story("a", "2026-08-25T12:00:00Z")];
  rankStories(list);
  assert.deepEqual(list.map((s) => s.id), ["b", "a"]);
});
