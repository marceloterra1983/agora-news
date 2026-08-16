import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { FONT_HTML_PX, FONT_STEPS, normalizeFontSize } from "../src/lib/news/font-scale.ts";
import { DEFAULT_SETTINGS } from "../src/lib/news/settings.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

test("default font step is Médio at 16px, not the 22px phone floor", () => {
  assert.equal(DEFAULT_SETTINGS.fontSize, "md");
  assert.equal(FONT_HTML_PX.md, 16);
  assert.equal(FONT_HTML_PX.sm, 14);
  assert.equal(FONT_HTML_PX.lg, 20);
  assert.ok(Math.abs(FONT_HTML_PX.sm / FONT_HTML_PX.md - 0.9) <= 0.03);
  assert.ok(Math.abs(FONT_HTML_PX.lg / FONT_HTML_PX.md - 1.25) <= 0.01);
});

test("Tamanho do texto has three steps and maps legacy xl to Grande", () => {
  assert.deepEqual(
    FONT_STEPS.map((s) => s.id),
    ["sm", "md", "lg"],
  );
  assert.deepEqual(
    FONT_STEPS.map((s) => s.label),
    ["Pequeno", "Médio", "Grande"],
  );
  assert.equal(normalizeFontSize("sm"), "sm");
  assert.equal(normalizeFontSize("md"), "md");
  assert.equal(normalizeFontSize("lg"), "lg");
  assert.equal(normalizeFontSize("xl"), "lg");
  assert.equal(normalizeFontSize(undefined), "md");
});

test("phone CSS does not force 22/28 on every data-font step", () => {
  const css = read("src/lib/news/phone-layout.css");
  const styles = read("src/styles.css");
  assert.doesNotMatch(css, /font-size:\s*22px\s*!important/);
  assert.doesNotMatch(css, /font-size:\s*28px\s*!important/);
  assert.doesNotMatch(css, /--agora-type:\s*22px/);
  assert.doesNotMatch(css, /--agora-headline:\s*28px/);
  assert.match(css, /html\[data-font="sm"\]/);
  assert.match(css, /html\[data-font="md"\]/);
  assert.match(css, /html\[data-font="lg"\]/);
  assert.match(css, /font-size:\s*16px/);
  assert.match(css, /font-size:\s*14px/);
  assert.match(css, /font-size:\s*20px/);
  assert.match(styles, /html\[data-font="md"\]\s*\{\s*font-size:\s*16px/);
});

test("Configurações and menu expose Tamanho do texto; applySettings writes data-font", () => {
  const page = read("src/routes/configuracoes.tsx");
  const menu = read("src/components/news/app-menu.tsx");
  const settings = read("src/lib/news/settings.ts");
  assert.match(page, /Tamanho do texto/);
  assert.match(page, /FONT_STEPS/);
  assert.match(page, /fontSize:\s*step\.id/);
  assert.match(menu, /Tamanho do texto/);
  assert.match(menu, /FONT_STEPS/);
  assert.match(settings, /el\.dataset\.font\s*=\s*next\.fontSize/);
  assert.match(settings, /SETTINGS_BOOT_SCRIPT/);
});
