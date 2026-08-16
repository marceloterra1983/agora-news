import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { AI_PROFILES } from "../src/lib/news/catalog-ai.mjs";
import { BRASIL_PROFILES } from "../src/lib/news/catalog-brasil.mjs";
import { TECH_PROFILES } from "../src/lib/news/catalog-tech.mjs";
import {
  catalogFor,
  filterStoriesForCatalog,
  handleInCatalog,
  sectionOfHandle,
} from "../src/lib/news/section-catalog.mjs";

const ALL_PROFILES = [...AI_PROFILES, ...TECH_PROFILES, ...BRASIL_PROFILES];

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

const FIXTURES = [
  { handle: "OpenAI", name: "OpenAI", group: "labs", section: "ai" },
  { handle: "sama", name: "Sam Altman", group: "lideres", section: "ai" },
  { handle: "verge", name: "The Verge", group: "tech-imprensa", section: "tech" },
  { handle: "folha", name: "Folha de S.Paulo", group: "br-jornais", section: "brasil" },
];

const EXTRAS = [
  { handle: "ylecun", section: "ai" },
  { handle: "RenanSantosMBL", section: "brasil" },
  { handle: "orphan" },
];

function story(account, category) {
  return {
    id: `${account}-${category}`,
    title: "t",
    excerpt: "e",
    body: "b",
    original: "o",
    source: account,
    sourceLabel: `@${account}`,
    account,
    category,
  };
}

test("IA feed drops a leaked category=ai post whose handle is not in catalogFor(ai)", () => {
  const catalog = catalogFor("ai", { profiles: FIXTURES, extras: EXTRAS });
  const listed = filterStoriesForCatalog(
    [story("RenanSantosMBL", "ai"), story("@renansantosmbl", "ai"), story("OpenAI", "ai")],
    catalog,
  );
  assert.equal(handleInCatalog("RenanSantosMBL", catalog), false);
  assert.deepEqual(
    listed.map((s) => s.source),
    ["OpenAI"],
  );
});

test("a catalog IA handle with category=ai stays in the IA list", () => {
  const catalog = catalogFor("ai", { profiles: FIXTURES, extras: EXTRAS });
  const listed = filterStoriesForCatalog(
    [story("OpenAI", "ai"), story("sama", "ai"), story("ylecun", "ai")],
    catalog,
  );
  assert.deepEqual(
    listed.map((s) => s.source.toLowerCase()),
    ["openai", "sama", "ylecun"],
  );
});

test("ingest maps handle to catalog section and does not default unknown handles to ai", () => {
  const input = { profiles: FIXTURES, extras: EXTRAS };
  assert.equal(sectionOfHandle("OpenAI", input), "ai");
  assert.equal(sectionOfHandle("@SAMA", input), "ai");
  assert.equal(sectionOfHandle("verge", input), "tech");
  assert.equal(sectionOfHandle("RenanSantosMBL", input), "brasil");
  assert.equal(sectionOfHandle("nobody", input), "");
  assert.equal(sectionOfHandle("orphan", input), "");
});

test("real IA seed does not include Renan; feed/ingest/supabase share catalogFor", () => {
  const ai = catalogFor("ai", { profiles: ALL_PROFILES });
  assert.equal(handleInCatalog("RenanSantosMBL", ai), false);
  assert.equal(
    ALL_PROFILES.some((p) => p.handle.toLowerCase() === "renansantosmbl"),
    false,
  );

  const ingest = read("src/lib/news/ingest.ts");
  assert.match(ingest, /sectionOfHandle/);
  assert.doesNotMatch(ingest, /profileByHandle\(handle\)\?\.section\s*\|\|\s*["']ai["']/);
  assert.doesNotMatch(ingest, /category:\s*["']ai["']/);

  const feed = read("src/lib/news/feed.ts");
  assert.match(feed, /catalogFor|filterStoriesForCatalog|serverCatalogFor/);
  assert.match(feed, /handleInCatalog|filterStoriesForCatalog/);

  const supabase = read("src/lib/news/supabase.ts");
  assert.match(supabase, /catalogFor|handleInCatalog|accounts/);

  const news = read("src/lib/news/server-news.ts");
  assert.match(news, /catalogFor|serverCatalogFor|filterStoriesForCatalog/);

  for (const rel of [
    "src/lib/news/ingest.ts",
    "src/lib/news/feed.ts",
    "src/lib/news/supabase.ts",
    "src/lib/news/section-catalog.mjs",
    "src/lib/news/server-news.ts",
  ]) {
    assert.doesNotMatch(read(rel), /renansantosmbl/i, `${rel} must not special-case one handle`);
  }
});
