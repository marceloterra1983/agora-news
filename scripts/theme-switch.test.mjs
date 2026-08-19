import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

test("header shows IA/Tech/Brasil as chips and keeps a native Assunto select", () => {
  const chrome = read("src/components/news/app-chrome.tsx");
  assert.match(chrome, /data-section-switch/);
  assert.match(chrome, /data-section-chip/);
  assert.match(chrome, /<select\b[^>]*id=["']agora-section["']/);
  assert.match(chrome, /htmlFor=["']agora-section["']/);
  assert.match(chrome, /className="sr-only"/);
  assert.doesNotMatch(chrome, /ChevronDown/);
});

test("menu and settings pick theme with three pressed options, not a cycle", () => {
  const ui = read("src/components/news/settings-ui.tsx");
  const menu = read("src/components/news/app-menu.tsx");
  const settings = read("src/routes/configuracoes.tsx");
  assert.match(ui, /data-theme-switch/);
  assert.match(ui, /export function ThemeSwitch/);
  assert.match(ui, /label: "Sistema"/);
  assert.match(ui, /label: "Claro"/);
  assert.match(ui, /label: "Escuro"/);
  assert.match(menu, /ThemeSwitch/);
  assert.match(settings, /ThemeSwitch/);
  assert.doesNotMatch(menu, /cycleTheme/);
});

test("PWA cache-bust advances so the new pickers load", () => {
  const rootSrc = read("src/routes/__root.tsx");
  assert.match(rootSrc, /agora-cache-bust-v22/);
});
