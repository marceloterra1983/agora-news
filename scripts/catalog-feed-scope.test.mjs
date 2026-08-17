import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { AI_PROFILES } from "../src/lib/news/catalog-ai.mjs";
import { BRASIL_PROFILES } from "../src/lib/news/catalog-brasil.mjs";
import { TECH_PROFILES } from "../src/lib/news/catalog-tech.mjs";
import { categoryForCsvRow } from "../src/lib/news/csv-category.mjs";
import { storiesFromCsv } from "../src/lib/news/csv.ts";
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
    url: `https://x.com/${account}/status/1`,
    image: null,
    publishedAt: "2026-08-17T12:00:00.000Z",
    source: account,
    sourceLabel: `@${account}`,
    account,
    category,
    media: "Nenhuma",
    batch: "cache-leak",
  };
}

function csvText(rows) {
  const header =
    "ID do Post,Conta de origem,Síntese (1 linha),Categoria,Tradução (PT-BR),Conteúdo";
  const body = rows
    .map(
      ([id, account, title, category]) =>
        `${id},${account},${title},${category},corpo,original`,
    )
    .join("\n");
  return `${header}\n${body}\n`;
}

const SILENT_AI = /\|\|\s*["']ai["']|category:\s*["']ai["']|section\s*\|\|\s*["']ai["']/;

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

test("catalog-scoped cache keys cannot return a Renan-like leak", () => {
  const catalog = catalogFor("ai", { profiles: FIXTURES, extras: EXTRAS });
  const leaked = [story("RenanSantosMBL", "ai"), story("OpenAI", "ai")];
  const listed = filterStoriesForCatalog(leaked, catalog);
  assert.equal(
    listed.some((s) => /renan/i.test(s.source)),
    false,
    "cached snapshot must not be returned as-is",
  );
  assert.deepEqual(
    listed.map((s) => s.source),
    ["OpenAI"],
  );

  const supabase = read("src/lib/news/supabase.ts");
  assert.match(supabase, /accounts/);
  assert.match(supabase, /account.*in\.\(/s);
  assert.match(supabase, /accountKey/);

  const feed = read("src/lib/news/feed.ts");
  assert.doesNotMatch(feed, /age < SOFT_MS\) return hit\.payload/);
  assert.doesNotMatch(feed, /return previous;/);
  assert.match(feed, /filterStories\(|scopeCachedStories|filterStoriesForCatalog/);

});

test("csv parser never assigns ai to a handle outside the IA catalog", () => {
  const ai = catalogFor("ai", { profiles: ALL_PROFILES });
  assert.notEqual(categoryForCsvRow("RenanSantosMBL", ""), "ai");
  assert.notEqual(categoryForCsvRow("RenanSantosMBL", "ai"), "ai");
  assert.notEqual(categoryForCsvRow("nobody", ""), "ai");
  assert.equal(categoryForCsvRow("OpenAI", ""), "ai");
  assert.equal(categoryForCsvRow("OpenAI", "ai"), "ai");
  const parsed = storiesFromCsv(
    csvText([
      ["1", "RenanSantosMBL", "titulo vazado", ""],
      ["2", "RenanSantosMBL", "titulo marcado ai", "ai"],
      ["3", "nobody", "desconhecido", ""],
      ["4", "OpenAI", "ok vazio", ""],
      ["5", "OpenAI", "ok ai", "ai"],
    ]),
  );
  for (const row of parsed) {
    if (row.category === "ai") {
      assert.equal(handleInCatalog(row.source, ai), true, `${row.source} must not inherit ai`);
    }
  }
  assert.equal(
    parsed.some((s) => /renan/i.test(s.source) && s.category === "ai"),
    false,
  );
  assert.ok(parsed.some((s) => s.source.toLowerCase() === "openai" && s.category === "ai"));

  const fallback = storiesFromCsv(read("src/lib/news/agora-feed.csv"));
  for (const row of fallback) {
    if (row.category === "ai") {
      assert.equal(handleInCatalog(row.source, ai), true, `fallback ${row.source}`);
    }
  }
});

test("ingest/csv/feed/supabase do not silently default to ai", () => {
  const ingest = read("src/lib/news/ingest.ts");
  assert.doesNotMatch(ingest, /storiesFromDbPosts\([^)]*["']ai["']/);
  assert.doesNotMatch(ingest, SILENT_AI);

  const csv = read("src/lib/news/csv.ts");
  assert.doesNotMatch(csv, SILENT_AI);
  assert.doesNotMatch(csv, /\|\|\s*["']ai["']/);

  assert.doesNotMatch(read("src/lib/news/csv-category.mjs"), SILENT_AI);

  for (const rel of [
    "src/lib/news/feed.ts",
    "src/lib/news/supabase.ts",
    "src/lib/news/csv-category.mjs",
  ]) {
    assert.doesNotMatch(read(rel), /\|\|\s*["']ai["']/, `${rel} silent || "ai"`);
    assert.doesNotMatch(read(rel), /category:\s*["']ai["']/, `${rel} category: "ai"`);
    assert.doesNotMatch(read(rel), /section\s*\|\|\s*["']ai["']/, `${rel} section || "ai"`);
  }
});
