import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("taxonomy maps novos → Outros", () => {
  const src = readFileSync(join(root, "src/lib/news/catalog-taxonomy.mjs"), "utf8");
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
  assert.match(src, /catalog\.groupIds\.map|useSectionCatalog/);
  assert.doesNotMatch(src, /GROUP_ORDER\.map/);
});

test("group hues live in @theme and both palettes consume them", () => {
  const theme = readFileSync(join(root, "src/styles.css"), "utf8");
  const jewel = readFileSync(join(root, "src/lib/news/group-style.ts"), "utf8");
  const wash = readFileSync(join(root, "src/lib/news/groups.ts"), "utf8");
  for (const g of ["labs", "lideres", "pesquisa", "imprensa", "builders", "novos"]) {
    assert.match(theme, new RegExp(`--agora-hue-${g}:`));
    assert.match(jewel, new RegExp(`var\\(--agora-hue-${g}\\)`));
    assert.match(wash, new RegExp(`var\\(--agora-hue-${g}\\)`));
  }
});

test("group-tag uses wash, at least 11px rem, without a leading dot", () => {
  const src = readFileSync(join(root, "src/components/news/group-tag.tsx"), "utf8");
  assert.match(src, /customGroupStyle/);
  assert.doesNotMatch(src, /st\.tag/);
  assert.doesNotMatch(src, /text-\[9px\]/);
  assert.match(src, /0\.6875rem|agora-kicker|0\.875rem/);
  assert.doesNotMatch(src, /st\.dot/);
  assert.doesNotMatch(src, /groupPip/);
  assert.doesNotMatch(src, /size-1\.5/);
});
