import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { displayBody, displayTitle } from "../src/lib/news/format.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

const ENGADGET =
  "O criador de Deus Ex está se aposentando.\nhttps://www.engadget.com/2239713/warren-spector-founding-father-of-immersive-sims-retired-game-development/?utm_term=Autofeed&utm_campaign=Autofeed";

test("displayTitle keeps the sentence and drops the written url", () => {
  const title = displayTitle(ENGADGET);
  assert.equal(title, "O criador de Deus Ex está se aposentando.");
  assert.doesNotMatch(title, /https?:\/\//i);
  assert.doesNotMatch(title, /engadget\.com/i);
  assert.doesNotMatch(displayTitle("https://www.engadget.com/only"), /https?:\/\//i);
});

test("displayBody never leaves a written url in the post text", () => {
  const body = displayBody(ENGADGET);
  assert.match(body, /Deus Ex/);
  assert.doesNotMatch(body, /https?:\/\//i);
  assert.doesNotMatch(body, /www\./i);
});

test("extractWrittenLinks returns the published href and skips the X status", async () => {
  const { extractWrittenLinks, publishedLinksFrom, stripWrittenLinks } =
    await import("../src/lib/news/written-links.mjs");
  const hrefs = extractWrittenLinks(ENGADGET);
  assert.equal(hrefs.length, 1);
  assert.match(hrefs[0], /^https:\/\/www\.engadget\.com\//);
  assert.deepEqual(
    publishedLinksFrom(
      `${ENGADGET}\nhttps://x.com/engadget/status/1`,
      "https://x.com/engadget/status/1",
    ),
    hrefs,
  );
  assert.doesNotMatch(stripWrittenLinks("Veja www.example.com/a agora"), /www\./i);
});

test("publishedLinksFrom keeps a single published Link when t.co and utm copies appear", async () => {
  const { publishedLinksFrom } = await import("../src/lib/news/written-links.mjs");
  const hrefs = publishedLinksFrom(
    `${ENGADGET}\nhttps://t.co/abcdEFG\nhttps://engadget.com/2239713/warren-spector-founding-father-of-immersive-sims-retired-game-development/?utm_source=twitter`,
    "https://x.com/engadget/status/1",
  );
  assert.equal(hrefs.length, 1);
  assert.match(hrefs[0], /engadget\.com\/2239713\//);
  assert.doesNotMatch(hrefs[0], /t\.co/i);
});

test("feed and article hide the url behind a Link label", () => {
  const card = read("src/components/news/story-card.tsx");
  const article = read("src/components/news/article-view.tsx");
  const chip = read("src/components/news/written-link.tsx");
  assert.match(card, /WrittenLinks/);
  assert.match(article, /WrittenLinks/);
  assert.match(article, /displayBody\(/);
  assert.doesNotMatch(article, /\{story\.body \|\| story\.excerpt\}/);
  assert.match(chip, />Link</);
  assert.match(chip, /Link publicado/);
  assert.match(chip, /safeHttpHref/);
  assert.match(chip, /target=["']_blank["']/);
  assert.doesNotMatch(chip, />\{href\}/);
});
