import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { AI_PROFILES } from "../src/lib/news/catalog-ai.mjs";
import { BRASIL_PROFILES } from "../src/lib/news/catalog-brasil.mjs";
import { TECH_PROFILES } from "../src/lib/news/catalog-tech.mjs";
import { SECTION_TAXONOMY } from "../src/lib/news/catalog-taxonomy.mjs";
import { catalogFor } from "../src/lib/news/section-catalog.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

const TECH_GROUPS = [
  ["tech-empresas", "Empresas"],
  ["tech-imprensa", "Imprensa"],
  ["tech-startups", "Startups"],
  ["tech-gadgets", "Gadgets"],
  ["tech-seguranca", "Segurança"],
  ["tech-devs", "Devs"],
];

const BRASIL_GROUPS = [
  ["br-jornais", "Jornais"],
  ["br-politica", "Política"],
  ["br-economia", "Economia"],
  ["br-colunistas", "Colunistas"],
  ["br-instituicoes", "Instituições"],
];

const AI_GROUPS = [
  ["labs", "Empresas"],
  ["lideres", "CEOs"],
  ["pesquisa", "Cientistas"],
  ["imprensa", "Imprensa"],
  ["builders", "Devs"],
];

const AI_KEEP = [
  "grok",
  "OpenAI",
  "sama",
  "ylecun",
  "karpathy",
  "TheRundownAI",
  "simonw",
  "elonmusk",
];

const SEEDS = { ai: AI_PROFILES, tech: TECH_PROFILES, brasil: BRASIL_PROFILES };

function live(section) {
  return catalogFor(section, { profiles: SEEDS[section] });
}

function counts(section) {
  const map = new Map();
  for (const p of SEEDS[section]) {
    map.set(p.group, (map.get(p.group) || 0) + 1);
  }
  return map;
}

function assertTheme(section, expected) {
  const cat = live(section);
  const byId = Object.fromEntries(cat.groups.map((g) => [g.id, g.label]));
  for (const [id, label] of expected) {
    assert.ok(cat.groupIds.includes(id), `${section} missing group ${id}`);
    assert.equal(byId[id], label, `${section} ${id} label`);
  }
  assert.ok(!cat.groupIds.includes("novos"), `${section} should hide empty Outros`);
  const n = counts(section);
  for (const [id] of expected) {
    const size = n.get(id) || 0;
    assert.ok(size >= 6 && size <= 15, `${section} ${id} has ${size} handles`);
  }
  const handles = SEEDS[section].map((p) => p.handle.toLowerCase());
  assert.equal(handles.length, new Set(handles).size, `${section} has duplicate handles`);
}

test("catalogFor('tech') exposes Tech groups and hides IA-only chips", () => {
  const tech = live("tech");
  assertTheme("tech", TECH_GROUPS);
  assert.ok(!tech.groupIds.includes("lideres"));
  assert.ok(!tech.groupIds.includes("pesquisa"));
  assert.ok(!tech.groupIds.includes("labs"));
  assert.ok(!tech.handles.includes("sama"));
  assert.ok(!tech.handles.includes("folha"));
  assert.ok(tech.handles.includes("verge"));
  assert.ok(tech.handles.includes("apple"));
  assert.ok(tech.handles.includes("mkbhd"));
});

test("catalogFor('brasil') exposes Brasil groups and drops Silicon Valley", () => {
  const brasil = live("brasil");
  assertTheme("brasil", BRASIL_GROUPS);
  assert.ok(!brasil.groupIds.includes("labs"));
  assert.ok(!brasil.groupIds.includes("lideres"));
  assert.ok(!brasil.handles.includes("sama"));
  assert.ok(!brasil.handles.includes("elonmusk"));
  assert.ok(!brasil.handles.includes("verge"));
  assert.ok(brasil.handles.includes("folha"));
  assert.ok(brasil.handles.includes("poder360"));
  assert.ok(brasil.handles.includes("stf_oficial"));
  assert.ok(!brasil.handles.includes("startseoficial"));
});

test("catalogFor('ai') keeps the IA groups, labels and seed", () => {
  const ai = live("ai");
  const byId = Object.fromEntries(ai.groups.map((g) => [g.id, g.label]));
  for (const [id, label] of AI_GROUPS) {
    assert.ok(ai.groupIds.includes(id), `IA missing ${id}`);
    assert.equal(byId[id], label);
  }
  const aiLabels = SECTION_TAXONOMY.ai.labels;
  assert.equal(aiLabels.labs, "Empresas");
  assert.equal(aiLabels.lideres, "CEOs");
  assert.equal(aiLabels.pesquisa, "Cientistas");
  assert.equal(aiLabels.imprensa, "Imprensa");
  assert.equal(aiLabels.builders, "Devs");
  assert.equal(aiLabels.regulacao, "Regulação");
  assert.equal(aiLabels["ai-riscos"], "Riscos");
  assert.equal(aiLabels.novos, "Outros");
  assert.equal(SECTION_TAXONOMY.tech.labels["tech-opensource"], "Open source");
  assert.equal(SECTION_TAXONOMY.tech.labels["tech-ciencia"], "Ciência");
  assert.equal(SECTION_TAXONOMY.brasil.labels["br-ciencia"], "Ciência");
  assert.equal(SECTION_TAXONOMY.brasil.labels["br-mundo"], "Mundo");
  assert.equal(SECTION_TAXONOMY.brasil.labels["br-cultura"], "Cultura");
  const seed = AI_PROFILES;
  assert.equal(seed.length, 48);
  for (const handle of AI_KEEP) {
    assert.ok(
      seed.some((p) => p.handle === handle),
      `IA lost ${handle}`,
    );
  }
  assert.ok(!ai.handles.includes("folha"));
  assert.ok(!ai.handles.includes("verge"));
});

test("switching secao changes chip labels from the catalog", () => {
  const ai = live("ai");
  const tech = live("tech");
  const brasil = live("brasil");
  const labels = (cat) => cat.groups.map((g) => g.label);
  assert.ok(labels(ai).includes("CEOs"));
  assert.ok(labels(ai).includes("Cientistas"));
  assert.ok(!labels(tech).includes("CEOs"));
  assert.ok(labels(tech).includes("Startups"));
  assert.ok(labels(tech).includes("Gadgets"));
  assert.ok(labels(tech).includes("Segurança"));
  assert.ok(!labels(brasil).includes("CEOs"));
  assert.ok(labels(brasil).includes("Jornais"));
  assert.ok(labels(brasil).includes("Política"));
  assert.ok(labels(brasil).includes("Instituições"));
});

test("chrome and group tags read per-section catalog labels", () => {
  const chrome = read("src/components/news/app-chrome.tsx");
  const tag = read("src/components/news/group-tag.tsx");
  assert.match(chrome, /catalog\.groups|useSectionCatalog/);
  assert.doesNotMatch(chrome, /GROUP_LABELS\[id/);
  assert.match(tag, /groupLabel\(/);
  assert.doesNotMatch(tag, /GROUP_LABELS\[id/);
  assert.ok(AI_PROFILES.some((p) => p.group === "labs"));
  assert.ok(TECH_PROFILES.some((p) => p.group === "tech-imprensa"));
  assert.ok(BRASIL_PROFILES.some((p) => p.group === "br-jornais"));
});
