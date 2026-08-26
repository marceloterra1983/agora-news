import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

test("custom groups and per-handle override come from the Grok Fontes model", () => {
  const sectionPrefs = read("src/lib/news/section-prefs.mjs");
  assert.match(sectionPrefs, /agora-custom-groups-v1/);
  assert.match(sectionPrefs, /agora-fontes-groups-v1/);
  const groups = read("src/lib/news/groups.ts");
  assert.match(groups, /export function addCustomGroup/);
  assert.match(groups, /export function allGroupIds/);
  const prefs = read("src/lib/news/fontes-prefs.ts");
  assert.match(prefs, /export function setGroupOverride/);
  const hook = read("src/lib/news/use-fontes-prefs.ts");
  assert.match(hook, /setGroup:/);
  assert.match(hook, /groupOf:/);
});

test("open Fontes card keeps star/bell/power/group only in the footer", () => {
  const row = read("src/components/news/fontes-profile-row.tsx");
  const card = read("src/components/news/fonte-profile-card.tsx");
  const open = row.slice(row.indexOf("{open ?"));
  assert.match(open, /FonteProfileCard/);
  assert.match(card, /FonteControls/);
  assert.match(card, /onSetGroup/);
  const header = row.slice(0, row.indexOf("{open ?"));
  assert.doesNotMatch(header, /<FonteControls/);
  assert.match(read("src/components/news/fontes-closed-post.tsx"), /formatPostEr/);
  assert.match(row, /GroupTag/);
});

test("FonteControls can edit group and create a custom one", () => {
  const src = read("src/components/news/fonte-controls.tsx");
  assert.match(src, /Editar grupo/);
  assert.match(src, /Criar grupo/);
  assert.match(src, /addCustomGroup/);
});

test("Fontes sort são chips rotulados numa linha abaixo do header", () => {
  const chrome = read("src/components/news/app-chrome.tsx");
  const fontes = read("src/routes/fontes.tsx");
  assert.match(chrome, /toolbar\?:/);
  assert.match(chrome, /\{toolbar\}/);
  assert.match(fontes, /toolbar=\{/);
  // Decisão do dono: chips com rótulo no conteúdo, não select no header.
  assert.match(fontes, /FontesSortChips/);
  const chip = read("src/components/news/fontes-chip.tsx");
  assert.match(chip, /aria-label="Ordenar fontes"/);
  assert.match(chip, /data-testid="fontes-toolbar"/);
  assert.doesNotMatch(`${fontes}\n${chip}`, /<select\b/);
  assert.doesNotMatch(fontes, /sticky top-\[57px\]/);
  const css = read("src/styles.css");
  assert.match(css, /--agora-header:\s*3\.75rem/);
});


test("group chips float in a fixed dock above the tab bar (decisão do dono)", () => {
  const chrome = read("src/components/news/app-chrome.tsx");
  assert.match(chrome, /function GroupDock/);
  assert.match(chrome, /data-chrome="groups"/);
  assert.match(chrome, /data-groups-dock/);
  assert.match(chrome, /data-group-chip/);
  const css = read("src/lib/news/phone-layout.css");
  assert.match(css, /\[data-chrome="groups"\][\s\S]{0,220}bottom:/);
  assert.match(css, /--agora-groups/);
});
