import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  displaySourceAt,
  displaySourceByline,
  displaySourceInitial,
  rssLabelFor,
  storySourceFromAccount,
} from "../src/lib/news/rss-catalog.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

const TECMUNDO = "r_9c68d283ae03";

test("RSS seed byline is the site title, not the internal id", () => {
  assert.equal(rssLabelFor(TECMUNDO), "TecMundo");
  assert.equal(displaySourceByline(TECMUNDO, "TecMundo"), "TecMundo");
  assert.equal(displaySourceByline(`@${TECMUNDO}`, `@${TECMUNDO}`), "TecMundo");
  assert.equal(displaySourceInitial(TECMUNDO, "TecMundo"), "T");
  assert.equal(displaySourceAt(TECMUNDO), "");
  assert.doesNotMatch(displaySourceByline(TECMUNDO, "TecMundo"), /r_[a-f0-9]{12}/i);
});

test("X handle byline keeps @screen_name", () => {
  assert.equal(displaySourceByline("openai", "@openai"), "@openai");
  assert.equal(displaySourceByline("openai", ""), "@openai");
  assert.equal(displaySourceInitial("openai", "@openai"), "O");
  assert.equal(displaySourceAt("openai"), "@openai");
});

test("owned RSS without seed title uses hostname, never the hash", () => {
  assert.equal(
    displaySourceByline("r_aaaaaaaaaaaa", "example.com"),
    "example.com",
  );
  assert.equal(displaySourceByline("r_aaaaaaaaaaaa", ""), "Site");
});

test("storySourceFromAccount maps seed RSS to TecMundo", () => {
  const row = storySourceFromAccount(TECMUNDO, {
    source: "rss",
    postUrl: "https://www.tecmundo.com.br/produto/415584.htm",
  });
  assert.equal(row.source, TECMUNDO);
  assert.equal(row.sourceLabel, "TecMundo");
  assert.equal(displaySourceByline(row.source, row.sourceLabel), "TecMundo");
});

test("supabase and csv map accounts through storySourceFromAccount", () => {
  assert.match(read("src/lib/news/supabase.ts"), /storySourceFromAccount/);
  assert.match(read("src/lib/news/csv.ts"), /storySourceFromAccount/);
});

test("reader, article and profile popup use the RSS byline helper", () => {
  const card = read("src/components/news/story-card.tsx");
  const article = read("src/components/news/article-view.tsx");
  const popup = read("src/components/news/feed-profile-popup.tsx");
  const fonte = read("src/components/news/fonte-profile-card.tsx");
  assert.match(card, /displaySourceByline/);
  assert.match(card, /displaySourceInitial/);
  assert.doesNotMatch(card, /lowercase">@\{handle\}/);
  assert.match(article, /displaySourceByline/);
  assert.match(popup, /displaySourceAt/);
  assert.match(fonte, /isRssAccount/);
});
