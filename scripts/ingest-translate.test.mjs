import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { postsNeedingPt, mergeRetranslateRows, retranslateMissingPt } from "../src/lib/news/ingest-translate.mjs";

const EN = "This week the models have been better than the last ones.";
const PT = "Nesta semana os modelos têm sido melhores do que os anteriores.";

test("postsNeedingPt selects English rows that stored the original as PT", () => {
  const need = postsNeedingPt([
    { post_id: "1", content: EN, translation_pt: EN, category: "ai" },
    { post_id: "2", content: EN, translation_pt: PT, category: "ai" },
    { post_id: "last_x", content: EN, translation_pt: EN, category: "x-last" },
    { post_id: "3", content: "já está em português.", translation_pt: "já está em português.", category: "ai" },
  ]);
  assert.deepEqual(need.map((r) => r.post_id), ["1"]);
});

test("retranslateMissingPt upserts only accepted Portuguese", async () => {
  const upserted = [];
  const written = await retranslateMissingPt({
    listRecent: async () => [
      {
        post_id: "2093",
        account: "wired",
        posted_at: "2026-08-27T21:00:00.000Z",
        posted_at_sp: "2026-08-27T18:00:00.000Z",
        content: EN,
        translation_pt: EN,
        summary_pt: EN,
        post_url: "https://x.com/wired/status/2093",
        media_label: "Nenhuma",
        image_url: "",
        category: "ai",
        batch_name: "batch",
        source: "x",
      },
    ],
    translate: async (text) => (text === EN ? PT : ""),
    upsert: async (rows) => {
      upserted.push(...rows);
      return { ok: true, count: rows.length, confirmedIds: rows.map((r) => r.post_id), failedIds: [] };
    },
    limit: 8,
  });
  assert.equal(written, 1);
  assert.equal(upserted[0].translation_pt, PT);
  assert.notEqual(upserted[0].translation_pt, EN);
});

test("mergeRetranslateRows puts empty-PT rows ahead of the newest window", () => {
  const oldEmpty = { post_id: "old_empty", translation_pt: "" };
  const newest = { post_id: "newest", translation_pt: "já em português." };
  const dup = { post_id: "old_empty", translation_pt: "dup" };
  assert.deepEqual(
    mergeRetranslateRows([oldEmpty], [newest, dup]).map((r) => r.post_id),
    ["old_empty", "newest"],
  );
});

test("retry query targets empty translation_pt instead of only the newest 200", () => {
  const src = readFileSync(new URL("../src/lib/news/ingest-translate.mjs", import.meta.url), "utf8");
  assert.match(src, /translation_pt\.eq\./);
  assert.match(src, /listPostsForRetranslate/);
  assert.doesNotMatch(src, /const RETRY_SCAN = 200/);
});

test("retranslateMissingPt skips a row when the translator still fails open", async () => {
  const upserted = [];
  const written = await retranslateMissingPt({
    listRecent: async () => [
      {
        post_id: "1",
        account: "wired",
        posted_at: "2026-08-27T21:00:00.000Z",
        content: EN,
        translation_pt: EN,
        summary_pt: EN,
        post_url: "https://x.com/w/status/1",
        media_label: "",
        image_url: "",
        category: "ai",
        batch_name: "b",
        source: "x",
      },
    ],
    translate: async (text) => text,
    upsert: async (rows) => {
      upserted.push(...rows);
      return { ok: true, count: rows.length, confirmedIds: rows.map((r) => r.post_id), failedIds: [] };
    },
  });
  assert.equal(written, 0);
  assert.equal(upserted.length, 0);
});
