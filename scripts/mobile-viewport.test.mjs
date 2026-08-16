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
  const shell = readFileSync(join(root, "src/lib/news/phone-shell.ts"), "utf8");
  const metas = src.match(/name:\s*"viewport"/g) ?? [];
  assert.equal(metas.length, 1);
  assert.match(src, /VIEWPORT_CONTENT/);
  assert.match(src, /PHONE_VIEWPORT_GUARD/);
  assert.match(src, /Cache-Control/);
  assert.match(shell, /width=device-width, initial-scale=1, viewport-fit=cover/);
  assert.doesNotMatch(src, /user-scalable\s*=\s*no/);
  assert.doesNotMatch(src, /maximum-scale\s*=\s*1(?!\d)/);
  assert.doesNotMatch(src, /width=1024/);
});

test("no viewport or touch-action locks pinch-zoom", () => {
  const files = [
    "src/routes/__root.tsx",
    "src/lib/news/phone-shell.ts",
    "src/lib/news/critical.css.ts",
    "src/lib/auth/popup.server.ts",
    "scripts/grok-pwa-shared.mjs",
    "scripts/install-page.html",
    "public/limpar.html",
    "src/styles.css",
  ].map((rel) => readFileSync(join(root, rel), "utf8"));
  for (const src of files) {
    assert.doesNotMatch(src, /user-scalable\s*=\s*no/i);
    assert.doesNotMatch(src, /maximum-scale\s*=\s*1(?:\.0+)?(?!\d)/i);
    assert.doesNotMatch(src, /touch-action:\s*pan-y\s*;/);
    assert.doesNotMatch(src, /touch-action:\s*pan-x\s*;/);
  }
  const css = readFileSync(join(root, "src/styles.css"), "utf8");
  assert.match(css, /touch-action:\s*pan-y pinch-zoom/);
  assert.match(css, /touch-action:\s*pan-x pinch-zoom/);
});

test("phone layout is driven by max-width 640px media query", () => {
  const css = readFileSync(join(root, "src/lib/news/phone-layout.css"), "utf8");
  const styles = readFileSync(join(root, "src/styles.css"), "utf8");
  const critical = readFileSync(join(root, "src/lib/news/critical.css.ts"), "utf8");
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /html\[data-shell="phone"\]/);
  assert.match(css, /100dvw/);
  assert.doesNotMatch(css, /--agora-type: 22px/);
  assert.doesNotMatch(css, /font-size: 22px !important/);
  assert.match(styles, /phone-layout\.css/);
  assert.match(critical, /phone-layout\.css\?raw/);
});

test("chrome does not set a desktop min-width and keeps chips inside the bar", () => {
  const chrome = readFileSync(join(root, "src/components/news/app-chrome.tsx"), "utf8");
  assert.doesNotMatch(chrome, WIDE_TW);
  assert.doesNotMatch(chrome, WIDE_MIN);
  assert.match(chrome, /data-h-scroll/);
  assert.match(chrome, /overflow-x-clip/);
  assert.match(chrome, /min-w-0/);
  assert.match(chrome, /data-chrome-root/);
  assert.match(chrome, /max-sm:max-w-none/);
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

test("phone type scale follows data-font instead of a 22/28 floor", () => {
  const css = readFileSync(join(root, "src/lib/news/phone-layout.css"), "utf8");
  const styles = readFileSync(join(root, "src/styles.css"), "utf8");
  assert.match(styles, /--agora-type:/);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /html\[data-shell="phone"\]/);
  assert.doesNotMatch(css, /font-size: 28px !important/);
  assert.doesNotMatch(css, /font-size: 22px !important/);
  assert.match(css, /min-height: 44px !important/);
  assert.match(css, /height: 44px !important/);
  assert.match(css, /html\[data-font="sm"\]/);
  assert.match(css, /html\[data-font="md"\]/);
  assert.match(css, /html\[data-font="lg"\]/);
});

test("phone chrome, Fontes and article use 44px tap targets", () => {
  const chrome = readFileSync(join(root, "src/components/news/app-chrome.tsx"), "utf8");
  const icon = readFileSync(join(root, "src/components/news/icon-btn.tsx"), "utf8");
  const chip = readFileSync(join(root, "src/components/news/fontes-chip.tsx"), "utf8");
  const row = readFileSync(join(root, "src/components/news/fontes-profile-row.tsx"), "utf8");
  const article = readFileSync(join(root, "src/components/news/article-view.tsx"), "utf8");
  const controls = readFileSync(join(root, "src/components/news/fonte-controls.tsx"), "utf8");
  const critical = readFileSync(join(root, "src/lib/news/critical.css.ts"), "utf8");
  assert.match(chrome, /h-\[44px\]/);
  assert.match(icon, /size-\[44px\]/);
  assert.match(chip, /tapIcon/);
  assert.match(row, /min-h-\[44px\]/);
  assert.match(article, /size-\[44px\]/);
  assert.match(article, /break-all/);
  assert.match(controls, /size-\[44px\]/);
  assert.match(critical, /width:44px;height:44px/);
});
