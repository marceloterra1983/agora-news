import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { isNewsRow } from "../src/lib/news/news-row.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("isNewsRow rejects x-last rows and last_ ids so they never become matérias", () => {
  const base = {
    post_id: "2088880284129210405",
    account: "ylecun",
    posted_at: "2026-08-16T00:00:00.000Z",
    posted_at_sp: null,
    content: "ok",
    translation_pt: "ok",
    summary_pt: "ok",
    post_url: "https://x.com/ylecun/status/1",
    media_label: null,
    image_url: null,
    category: "ai",
    batch_name: "ingest",
  };
  assert.equal(isNewsRow(base), true);
  assert.equal(isNewsRow({ ...base, category: "x-last" }), false);
  assert.equal(isNewsRow({ ...base, post_id: "last_ylecun" }), false);
});

test("watch DELETE API and extra-fontes pass section", () => {
  const api = readFileSync(join(root, "src/routes/api/watch.ts"), "utf8");
  assert.match(api, /searchParams\.get\("section"\)/);
  assert.match(api, /unregisterWatch\(userId,\s*handle,\s*section\)/);
  const extras = readFileSync(join(root, "src/lib/news/extra-fontes.ts"), "utf8");
  assert.match(extras, /qs\.set\("section"/);
  assert.match(extras, /dropWatch\(handle,\s*hit\?\.section\)/);
});
