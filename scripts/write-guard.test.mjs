import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { writeAllowed, writeDenialStatus } from "./write-guard.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("app write: only same-origin", () => {
  assert.equal(writeAllowed("app", { site: "same-origin" }), true);
  assert.equal(writeAllowed("app", { site: null }), false);
  assert.equal(writeAllowed("app", { site: "none" }), false);
  assert.equal(writeAllowed("app", { site: "cross-site" }), false);
  assert.equal(writeAllowed("app", { site: "same-site" }), false);
});

test("ingest requires bearer secret; fail-closed without it", () => {
  assert.equal(writeAllowed("ingest", { userAgent: "vercel-cron/1.0" }), false);
  assert.equal(writeAllowed("ingest", { vercelCron: "1" }), false);
  assert.equal(writeAllowed("ingest", { site: "same-origin" }), false);
  assert.equal(writeAllowed("ingest", { site: null }), false);
  assert.equal(writeAllowed("ingest", { site: "none" }), false);
  assert.equal(writeAllowed("ingest", { site: "cross-site" }), false);
  assert.equal(writeDenialStatus("ingest", {}), 401);

  const env = { cronSecret: "s3cret" };
  assert.equal(writeAllowed("ingest", { authorization: "Bearer s3cret" }, env), true);
  assert.equal(writeAllowed("ingest", { authorization: "Bearer no" }, env), false);
  assert.equal(writeAllowed("ingest", { site: "same-origin" }, env), false);
  assert.equal(writeAllowed("ingest", { vercelCron: "1" }, env), false);
  assert.equal(writeDenialStatus("ingest", env), 401);
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
  assert.match(ts, /same-origin/);

  const ingest = readFileSync(join(root, "src/routes/api/ingest.ts"), "utf8");
  assert.match(ingest, /requestWriteAllowed\(\s*"ingest"/);

  const watch = readFileSync(join(root, "src/routes/api/watch.ts"), "utf8");
  assert.match(watch, /requestWriteAllowed\(\s*"app"/);

  const profile = readFileSync(join(root, "src/routes/api/profile.ts"), "utf8");
  assert.match(profile, /requestWriteAllowed\(\s*"app"/);

  const push = readFileSync(join(root, "src/routes/api/push.ts"), "utf8");
  assert.match(push, /requestWriteAllowed\(\s*"app"/);

  const cache = readFileSync(join(root, "src/routes/api/cache.ts"), "utf8");
  assert.match(cache, /requestWriteAllowed\(\s*"ops"/);
});
