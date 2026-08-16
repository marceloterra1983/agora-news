import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../src/lib/db.ts"),
  "utf8",
);

test("PGLite migration glob is lazy so a deleted SQL file cannot take down SSR", () => {
  const glob = src.match(
    /import\.meta\.glob\("\/migrations\/\*\.sql",\s*\{[\s\S]*?\}\)/,
  );
  assert.ok(glob, "expected import.meta.glob for /migrations/*.sql");
  assert.doesNotMatch(glob[0], /eager:\s*true/);
  assert.match(src, /skip missing migration/);
});
