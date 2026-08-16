import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { catalogFor } from "../src/lib/news/section-catalog.mjs";
import { migrateLegacyCustom, migrateLegacyGroups } from "../src/lib/news/section-prefs.mjs";
import { extrasForSection } from "../src/lib/news/watch-section.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

const FIXTURES = [
  { handle: "OpenAI", name: "OpenAI", group: "labs", section: "ai" },
  { handle: "sama", name: "Sam Altman", group: "lideres", section: "ai" },
  { handle: "ylecun", name: "Yann LeCun", group: "pesquisa", section: "ai" },
  { handle: "TheRundownAI", name: "The Rundown", group: "imprensa", section: "ai" },
  { handle: "simonw", name: "Simon Willison", group: "builders", section: "ai" },
  { handle: "verge", name: "The Verge", group: "imprensa", section: "tech" },
  { handle: "Apple", name: "Apple", group: "labs", section: "tech" },
  { handle: "MKBHD", name: "Marques Brownlee", group: "builders", section: "tech" },
  { handle: "folha", name: "Folha de S.Paulo", group: "imprensa", section: "brasil" },
  { handle: "g1", name: "g1", group: "imprensa", section: "brasil" },
];

const EXTRAS = [
  { handle: "ylecun", section: "ai" },
  { handle: "RenanSantosMBL", section: "brasil" },
  { handle: "orphan" },
];

test("switching secao from ai to tech changes group chips and fontes handles", () => {
  const ai = catalogFor("ai", { profiles: FIXTURES, extras: EXTRAS });
  const tech = catalogFor("tech", { profiles: FIXTURES, extras: EXTRAS });
  const brasil = catalogFor("brasil", { profiles: FIXTURES, extras: EXTRAS });

  assert.ok(ai.handles.includes("openai"));
  assert.ok(ai.handles.includes("sama"));
  assert.ok(!ai.handles.includes("verge"));
  assert.ok(!ai.handles.includes("folha"));
  assert.ok(!ai.handles.includes("renansantosmbl"));

  assert.ok(tech.handles.includes("verge"));
  assert.ok(tech.handles.includes("apple"));
  assert.ok(tech.handles.includes("mkbhd"));
  assert.ok(!tech.handles.includes("openai"));
  assert.ok(!tech.handles.includes("sama"));
  assert.ok(!tech.handles.includes("folha"));

  assert.ok(brasil.handles.includes("folha"));
  assert.ok(brasil.handles.includes("renansantosmbl"));
  assert.ok(!brasil.handles.includes("openai"));
  assert.ok(!brasil.handles.includes("verge"));

  assert.ok(ai.groupIds.includes("lideres"));
  assert.ok(ai.groupIds.includes("labs"));
  assert.ok(!tech.groupIds.includes("lideres"));
  assert.ok(!tech.groupIds.includes("pesquisa"));
  assert.ok(tech.groupIds.includes("imprensa"));
  assert.ok(tech.groupIds.includes("labs"));
  assert.ok(tech.groupIds.includes("builders"));
  assert.deepEqual(brasil.groupIds.filter((id) => id !== "novos"), ["imprensa"]);
  assert.ok(brasil.groupIds.includes("novos"));
});

test("catalog extras stay in their section and empty groups stay hidden", () => {
  const ai = catalogFor("ai", { profiles: FIXTURES, extras: EXTRAS });
  const tech = catalogFor("tech", { profiles: FIXTURES, extras: EXTRAS });
  assert.equal(extrasForSection(EXTRAS, "ai").map((e) => e.handle).join(), "ylecun");
  assert.ok(!ai.groupIds.includes("novos"));
  assert.ok(!tech.groupIds.includes("novos"));
  const techPlus = catalogFor("tech", {
    profiles: FIXTURES,
    extras: [...EXTRAS, { handle: "levelsio", section: "tech" }],
  });
  assert.ok(techPlus.handles.includes("levelsio"));
  assert.ok(techPlus.groupIds.includes("novos"));
});

test("custom groups and overrides are namespaced per section", () => {
  const ai = catalogFor("ai", {
    profiles: FIXTURES,
    extras: EXTRAS,
    customGroups: [{ id: "meus-ceos", label: "Meus CEOs" }],
    overrides: { sama: "meus-ceos" },
  });
  const tech = catalogFor("tech", {
    profiles: FIXTURES,
    extras: EXTRAS,
    customGroups: [{ id: "gadgets", label: "Gadgets" }],
    overrides: { apple: "gadgets" },
  });
  assert.ok(ai.groupIds.includes("meus-ceos"));
  assert.ok(!ai.groupIds.includes("gadgets"));
  assert.ok(tech.groupIds.includes("gadgets"));
  assert.ok(!tech.groupIds.includes("meus-ceos"));
  assert.ok(!tech.groupIds.includes("lideres"));
});

test("legacy prefs migrate into the ai slice only", () => {
  const custom = migrateLegacyCustom([{ id: "meus", label: "Meus" }]);
  assert.deepEqual(
    custom.ai.map((g) => g.id),
    ["meus"],
  );
  assert.deepEqual(custom.tech ?? [], []);
  assert.deepEqual(custom.brasil ?? [], []);

  const groups = migrateLegacyGroups({ grok: "labs", verge: "imprensa" });
  assert.equal(groups.ai.grok, "labs");
  assert.equal(groups.ai.verge, "imprensa");
  assert.deepEqual(groups.tech ?? {}, {});
});

test("chrome and fontes read the section catalog instead of the global GROUP_ORDER chips", () => {
  const chrome = read("src/components/news/app-chrome.tsx");
  const fontes = read("src/routes/fontes.tsx");
  const prefs = read("src/lib/news/use-fontes-prefs.ts");
  assert.match(chrome, /catalogFor|useSectionCatalog|chipGroupIds/);
  assert.doesNotMatch(chrome, /GROUP_ORDER\.map/);
  assert.match(fontes, /catalogFor|useSectionCatalog|allGroupIds\(/);
  assert.match(prefs, /section/);
  assert.match(read("src/lib/news/prefs-server.ts"), /bySection/);
  assert.match(read("src/lib/news/prefs-sync.ts"), /bySection/);
});
