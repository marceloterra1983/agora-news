import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("prefs ignore client userId and use authMiddleware", () => {
  const src = readFileSync(join(root, "src/lib/news/prefs-server.ts"), "utf8");
  assert.match(src, /authMiddleware/);
  assert.match(src, /context\.userId/);
  assert.doesNotMatch(src, /cloudKvGet\(`prefs:\$\{data\.userId\}`\)/);
  assert.doesNotMatch(src, /cloudKvSet\(`prefs:\$\{data\.userId\}`/);
});

test("health does not depend on sources table", () => {
  const src = readFileSync(join(root, "src/routes/api/health.ts"), "utf8");
  assert.doesNotMatch(src, /rest\/v1\/sources/);
  assert.match(src, /probePosts/);
});

test("ingest invalidates fontes last-cache", () => {
  const src = readFileSync(join(root, "src/lib/news/ingest.ts"), "utf8");
  assert.match(src, /invalidateFontesLastCache/);
});

test("gitignore covers secrets, vendor, nested clone", () => {
  const src = readFileSync(join(root, ".gitignore"), "utf8");
  assert.match(src, /^node_modules\/$/m);
  assert.match(src, /^\.env$/m);
  assert.match(src, /^\.vercel\/$/m);
  assert.match(src, /^\/news\/$/m);
});
