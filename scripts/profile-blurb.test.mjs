import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { AI_PROFILES } from "../src/lib/news/catalog-ai.mjs";
import { BRASIL_PROFILES } from "../src/lib/news/catalog-brasil.mjs";
import { TECH_PROFILES } from "../src/lib/news/catalog-tech.mjs";
import { displayBlurb } from "../src/lib/news/profile-blurb.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

test("displayBlurb keeps the catalog line even when the X bio is present", () => {
  const apple = TECH_PROFILES.find((p) => p.handle === "Apple");
  const folha = BRASIL_PROFILES.find((p) => p.handle === "folha");
  const sama = AI_PROFILES.find((p) => p.handle === "sama");
  assert.ok(apple && folha && sama);
  assert.equal(displayBlurb("Apple", "Apple", "think different"), apple.blurb);
  assert.equal(displayBlurb("folha", "Folha de S.Paulo", "Jornal Folha de S.Paulo"), folha.blurb);
  assert.equal(displayBlurb("sama", "Sam Altman", "CEO of OpenAI"), sama.blurb);
});

test("displayBlurb keeps an extra-fonte AI summary when the handle is unknown", () => {
  assert.equal(
    displayBlurb("nova_fonte", "Alguém", "Pesquisadora de clima e energia no Brasil."),
    "Pesquisadora de clima e energia no Brasil.",
  );
});

test("Fontes card shows displayBlurb instead of the raw X bio", () => {
  const row = read("src/components/news/fontes-profile-row.tsx");
  assert.match(row, /displayBlurb\(/);
  assert.doesNotMatch(row, /row\.bio \|\| blurbFor/);
});

test("influence prefers the catalog/AI line over the live X description", () => {
  const src = read("src/lib/news/influence.ts");
  assert.match(src, /displayBlurb\(/);
  assert.doesNotMatch(src, /bio: stats\.bio/);
});

test("ingest does not persist the X bio as the profile summary", () => {
  const src = read("src/lib/news/ingest.ts");
  assert.match(src, /oneLineAbout/);
  assert.doesNotMatch(src, /summary_pt: prev\?\.summary_pt \|\| r\.bio/);
});
