import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  isSyntheticPostId,
  lastPostFromXLastRow,
  pickLatestFromPostRows,
  usableTweetId,
  xLastListParams,
} from "../src/lib/news/last-post-core.mjs";
import { validPushEndpoint } from "../src/lib/news/push-core.mjs";
import { writeAllowed } from "./write-guard.mjs";
import { writeAllowed as writeAllowedTs } from "../src/lib/news/write-guard.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("pickLatestFromPostRows skips last_/prfl_/watch_ even if they are newest", () => {
  const handle = "openai";
  const picked = pickLatestFromPostRows(
    [
      {
        post_id: "last_openai",
        posted_at: "2026-08-16T10:00:00.000Z",
        summary_pt: "placeholder last row",
        post_url: "",
      },
      {
        post_id: "prfl_openai",
        posted_at: "2026-08-16T09:00:00.000Z",
        summary_pt: "profile row",
        post_url: "https://x.com/openai",
      },
      {
        post_id: "1948000000000000000",
        posted_at: "2026-01-01T00:00:00.000Z",
        summary_pt: "real tweet",
        post_url: "https://x.com/openai/status/1948000000000000000",
      },
    ],
    handle,
  );
  assert.equal(picked?.id, "1948000000000000000");
  assert.equal(picked?.text, "real tweet");
});

test("pickLatestFromPostRows returns null when only synthetic rows exist", () => {
  assert.equal(
    pickLatestFromPostRows(
      [
        {
          post_id: "last_apple",
          posted_at: "2026-08-01T00:00:00.000Z",
          summary_pt: "stale x-last",
          post_url: "https://x.com/apple/status/1",
        },
      ],
      "apple",
    ),
    null,
  );
});

test("lastPostFromXLastRow extracts status id and never uses last_ as tweet id", () => {
  const fromUrl = lastPostFromXLastRow(
    {
      account: "OpenAI",
      post_id: "last_openai",
      posted_at: "2026-04-01T00:00:00.000Z",
      summary_pt: "hello",
      post_url: "https://x.com/OpenAI/status/42",
    },
    "OpenAI",
  );
  assert.equal(fromUrl?.id, "42");
  assert.equal(fromUrl?.url, "https://x.com/OpenAI/status/42");

  const noUrl = lastPostFromXLastRow(
    {
      account: "openai",
      post_id: "last_openai",
      posted_at: "2026-04-01T00:00:00.000Z",
      content: "hello",
      post_url: "",
    },
    "openai",
  );
  assert.equal(noUrl, null);
  assert.equal(usableTweetId("last_openai", ""), "");
  assert.equal(usableTweetId("99", ""), "99");
  assert.equal(isSyntheticPostId("last_openai"), true);
  assert.equal(isSyntheticPostId("1948"), false);
});

test("xLastListParams orders by posted_at and asks for more than 400 rows", () => {
  const params = xLastListParams();
  assert.equal(params.get("category"), "eq.x-last");
  assert.equal(params.get("order"), "posted_at.desc");
  assert.ok(Number(params.get("limit")) >= 1000);
});

test("push endpoints are restricted to HTTPS provider hosts", () => {
  assert.equal(validPushEndpoint("https://push.services.mozilla.com/wpush/v2/x"), true);
  assert.equal(validPushEndpoint("http://push.services.mozilla.com/wpush/v2/x"), false);
  assert.equal(validPushEndpoint("https://push.services.mozilla.com.evil.test/x"), false);
});

test("write-guard.ts reexports the mjs rules so the two cannot drift", () => {
  const ts = readFileSync(join(root, "src/lib/news/write-guard.ts"), "utf8");
  assert.match(ts, /from ["'].*write-guard\.mjs["']/);
  assert.doesNotMatch(ts, /export function writeAllowed/);
  assert.equal(writeAllowed("app", { site: "same-origin", userId: "u1" }), true);
  assert.equal(writeAllowedTs("app", { site: "same-origin", userId: "u1" }), true);
  assert.equal(writeAllowedTs("ingest", { authorization: "Bearer s" }, { cronSecret: "s" }), true);
});

test("store and API wire the new last-post, push and profile helpers", () => {
  const store = readFileSync(join(root, "src/lib/news/last-post-store.ts"), "utf8");
  const last = readFileSync(join(root, "src/lib/news/last-post.ts"), "utf8");
  const push = readFileSync(join(root, "src/lib/news/push-server.ts"), "utf8");
  const pushRoute = readFileSync(join(root, "src/routes/api/push.ts"), "utf8");
  const profile = readFileSync(join(root, "src/routes/api/profile.ts"), "utf8");
  const watch = readFileSync(join(root, "src/routes/api/watch.ts"), "utf8");
  assert.match(last, /pickLatestFromPostRows/);
  assert.match(store, /xLastListParams/);
  assert.match(store, /lastPostFromXLastRow/);
  assert.match(push, /validPushEndpoint/);
  assert.match(pushRoute, /status:\s*502/);
  assert.doesNotMatch(profile, /POST:\s*async|mergeClientProfile|upsertProfile/);
  assert.doesNotMatch(watch, /mergeClientProfile|upsertProfile/);
});
