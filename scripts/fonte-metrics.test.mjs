import assert from "node:assert/strict";
import test from "node:test";
import { pickBuzzRow } from "../src/lib/news/fonte-metrics.ts";

test("missing tweetId does not fall back to rows[0]", () => {
  const rows = [{ id: "aaa" }, { id: "bbb" }];
  assert.equal(pickBuzzRow(rows, "zzz"), null);
  assert.equal(pickBuzzRow(rows, "bbb")?.id, "bbb");
  assert.equal(pickBuzzRow(rows)?.id, "aaa");
  assert.equal(pickBuzzRow([], "bbb"), null);
});
