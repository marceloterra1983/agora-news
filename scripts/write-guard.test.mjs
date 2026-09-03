import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { safeBearerMatch, spendKeyAllowed, writeAllowed, writeDenialStatus } from "./write-guard.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("safeBearerMatch uses constant-time comparison", () => {
  assert.equal(safeBearerMatch("Bearer s3cret", "s3cret"), true);
  assert.equal(safeBearerMatch("Bearer wrong", "s3cret"), false);
  assert.equal(safeBearerMatch("Bearer s3creX", "s3cret"), false);
  assert.equal(safeBearerMatch("Bearer short", "s3cret"), false);
  assert.equal(safeBearerMatch("Bearer muchlongersecretthanexpected", "s3cret"), false);
  assert.equal(safeBearerMatch("", "s3cret"), false);
  assert.equal(safeBearerMatch(null, "s3cret"), false);
  assert.equal(safeBearerMatch("Bearer s3cret", ""), false);
});

test("app write: same-origin and session userId", () => {
  assert.equal(writeAllowed("app", { site: "same-origin" }), false);
  assert.equal(writeAllowed("app", { site: "same-origin", userId: "u1" }), true);
  assert.equal(writeAllowed("app", { site: "same-origin" }, { userId: "u1" }), true);
  assert.equal(writeAllowed("app", { site: null, userId: "u1" }), false);
  assert.equal(writeAllowed("app", { site: "none", userId: "u1" }), false);
  assert.equal(writeAllowed("app", { site: "cross-site", userId: "u1" }), false);
  assert.equal(writeAllowed("app", { site: "same-site", userId: "u1" }), false);
});

test("spendKeyAllowed is session or ingest, never anonymous", () => {
  assert.equal(spendKeyAllowed({ site: "same-origin" }), false);
  assert.equal(spendKeyAllowed({ site: "same-origin", userId: "u1" }), true);
  assert.equal(spendKeyAllowed({ authorization: "Bearer s3cret" }, { cronSecret: "s3cret" }), true);
  assert.equal(spendKeyAllowed({ authorization: "Bearer no" }, { cronSecret: "s3cret" }), false);
});

test("ingest requires bearer secret; fail-closed without it", () => {
  assert.equal(writeAllowed("ingest", { userAgent: "vercel-cron/1.0" }), false);
  assert.equal(writeAllowed("ingest", { vercelCron: "1" }), false);
  assert.equal(writeAllowed("ingest", { site: "same-origin" }), false);
  assert.equal(writeAllowed("ingest", { site: null }), false);
  assert.equal(writeAllowed("ingest", { site: "none" }), false);
  assert.equal(writeAllowed("ingest", { site: "cross-site" }), false);
  assert.equal(writeDenialStatus("ingest"), 401);

  const env = { cronSecret: "s3cret" };
  assert.equal(writeAllowed("ingest", { authorization: "Bearer s3cret" }, env), true);
  assert.equal(writeAllowed("ingest", { authorization: "Bearer no" }, env), false);
  assert.equal(writeAllowed("ingest", { site: "same-origin" }, env), false);
  assert.equal(writeAllowed("ingest", { vercelCron: "1" }, env), false);
  assert.equal(writeDenialStatus("ingest"), 401);
});

test("ops write: same-origin only", () => {
  assert.equal(writeAllowed("ops", { site: "same-origin" }), true);
  assert.equal(writeAllowed("ops", { userAgent: "vercel-cron/1.0" }), false);
  assert.equal(writeAllowed("ops", { vercelCron: "1" }), false);
  assert.equal(writeAllowed("ops", { site: null }), false);
  assert.equal(writeAllowed("ops", { site: "cross-site" }), false);
});

test("TS port and API routes call the guard", () => {
  const ts = readFileSync(join(root, "src/lib/news/write-guard.ts"), "utf8");
  assert.match(ts, /requestWriteAllowed/);
  assert.match(ts, /CRON_SECRET/);
  assert.match(ts, /write-guard\.mjs/);

  const ingest = readFileSync(join(root, "src/routes/api/ingest.ts"), "utf8");
  assert.match(ingest, /requestWriteAllowed\(\s*"ingest"/);

  const watch = readFileSync(join(root, "src/routes/api/watch.ts"), "utf8");
  assert.match(watch, /await requestWriteAllowed\(\s*"app"/);

  const profile = readFileSync(join(root, "src/routes/api/profile.ts"), "utf8");
  assert.doesNotMatch(profile, /POST:\s*async|requestWriteAllowed/);

  const push = readFileSync(join(root, "src/routes/api/push.ts"), "utf8");
  assert.match(push, /await requestWriteAllowed\(\s*"app"/);

  const cache = readFileSync(join(root, "src/routes/api/cache.ts"), "utf8");
  assert.match(cache, /requestWriteAllowed\(\s*"ops"/);
});
