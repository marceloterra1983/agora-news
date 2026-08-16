import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const WIDE_MIN = /min-width:\s*(?:[6-9]\d{2,}|[1-9]\d{3,})px/;
const WIDE_TW = /min-w-\[(?:[6-9]\d{2,}|[1-9]\d{3,})px\]/;

test("root head declares a single device-width viewport", () => {
  const src = readFileSync(join(root, "src/routes/__root.tsx"), "utf8");
  const metas = src.match(/name:\s*"viewport"/g) ?? [];
  assert.equal(metas.length, 1);
  assert.match(src, /width=device-width,\s*initial-scale=1/);
  assert.doesNotMatch(src, /user-scalable\s*=\s*no/);
  assert.doesNotMatch(src, /width=1024/);
});

test("chrome does not set a desktop min-width and keeps chips inside the bar", () => {
  const chrome = readFileSync(join(root, "src/components/news/app-chrome.tsx"), "utf8");
  assert.doesNotMatch(chrome, WIDE_TW);
  assert.doesNotMatch(chrome, WIDE_MIN);
  assert.match(chrome, /data-h-scroll/);
  assert.match(chrome, /overflow-x-clip/);
  assert.match(chrome, /min-w-0/);
});

test("base css clips horizontal overflow instead of a 1024px floor", () => {
  const css = readFileSync(join(root, "src/styles.css"), "utf8");
  const critical = readFileSync(join(root, "src/lib/news/critical.css.ts"), "utf8");
  assert.doesNotMatch(css, WIDE_MIN);
  assert.doesNotMatch(critical, WIDE_MIN);
  assert.match(css, /overflow-x:\s*clip/);
  assert.match(critical, /overflow-x:clip/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
});
