import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { formatCount } from "../src/lib/news/format.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

test("formatCount uses pt-BR mil/mi thresholds", () => {
  assert.equal(formatCount(999), "999");
  assert.equal(formatCount(1_000), "1,0 mil");
  assert.equal(formatCount(10_000), "10 mil");
  assert.equal(formatCount(1_000_000), "1,0 mi");
  assert.equal(formatCount(10_000_000), "10 mi");
});

test("client cards format counts from format, not influence", () => {
  const row = read("src/components/news/fontes-profile-row.tsx");
  const card = read("src/components/news/x-profile-card.tsx");
  assert.match(row, /formatCount/);
  assert.match(card, /formatCount/);
  assert.match(row, /from ["']@\/lib\/news\/format["']/);
  assert.match(card, /from ["']@\/lib\/news\/format["']/);
  assert.doesNotMatch(row, /formatCount[^;\n]*from ["']@\/lib\/news\/influence["']/);
  assert.doesNotMatch(card, /from ["']@\/lib\/news\/influence["']/);
});
