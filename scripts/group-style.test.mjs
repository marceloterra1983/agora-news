import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("GROUP_LABELS maps novos → Outros", () => {
  const src = readFileSync(join(root, "src/lib/news/profiles.ts"), "utf8");
  assert.match(src, /novos:\s*"Outros"/);
  assert.doesNotMatch(src, /novos:\s*"Novos"/);
});

test("group-style defines all six groups with chip + chipOn, no leading dots", () => {
  const src = readFileSync(join(root, "src/lib/news/group-style.ts"), "utf8");
  for (const g of ["labs", "lideres", "pesquisa", "imprensa", "builders", "novos"]) {
    assert.match(src, new RegExp(`${g}:\\s*\\{`));
  }
  assert.match(src, /chip:/);
  assert.match(src, /chipOn:/);
  assert.doesNotMatch(src, /\bdot:/);
});

test("app-chrome uses groupStyle for chips without leading dots", () => {
  const src = readFileSync(join(root, "src/components/news/app-chrome.tsx"), "utf8");
  assert.match(src, /groupStyle/);
  assert.match(src, /st\.chip/);
  assert.doesNotMatch(src, /st\.dot/);
  assert.doesNotMatch(src, /size-1\.5 rounded-full/);
});

test("group chips only render when the page can filter (onGroup)", () => {
  const src = readFileSync(join(root, "src/components/news/app-chrome.tsx"), "utf8");
  assert.match(src, /onGroup\s*\?/);
  assert.match(src, /GROUP_ORDER\.map/);
});

test("group-tag uses colored tag without a leading dot", () => {
  const src = readFileSync(join(root, "src/components/news/group-tag.tsx"), "utf8");
  assert.match(src, /groupStyle/);
  assert.match(src, /st\.tag/);
  assert.doesNotMatch(src, /st\.dot/);
  assert.doesNotMatch(src, /groupPip/);
  assert.doesNotMatch(src, /size-1\.5/);
});
