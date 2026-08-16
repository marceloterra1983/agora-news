import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  chunkText,
  isDistinctTitle,
  needsFullTranslation,
  parseGtx,
} from "../src/lib/news/story-pt.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

const LECUN_EN =
  "For about 10 years now, I have argued that the *only* way forward is for AI technology to be widely available, shared, and open. Like the printing press and the Internet, AI amplifies human intelligence.";
const LECUN_CUT =
  "Há cerca de 10 anos que defendo que o *único* caminho a seguir é que a tecnologia de IA esteja amplamente disponível";

test("truncated PT against a longer English original needs a full translation", () => {
  assert.equal(needsFullTranslation(LECUN_EN, LECUN_CUT), true);
  assert.equal(needsFullTranslation(LECUN_EN, ""), true);
  assert.equal(needsFullTranslation(LECUN_EN, LECUN_EN), true);
  assert.equal(needsFullTranslation("já está em português.", "já está em português."), false);
  assert.equal(
    needsFullTranslation(
      "Open models are the only path.",
      "Modelos abertos são o único caminho.",
    ),
    false,
  );
});

test("title that is just a cut of the body is not distinct", () => {
  assert.equal(isDistinctTitle(LECUN_CUT, `${LECUN_CUT}plifica a inteligência.`), false);
  assert.equal(isDistinctTitle("Yann LeCun comenta o parto na Europa.", LECUN_EN), true);
  assert.equal(isDistinctTitle("mesmo texto", "mesmo texto"), false);
});

test("chunkText splits on paragraph or sentence, not mid-word when possible", () => {
  const long = `${"alpha ".repeat(80)}\n\n${"bravo ".repeat(80)}`;
  const parts = chunkText(long, 200);
  assert.ok(parts.length >= 2);
  assert.equal(parts.join(""), long);
  assert.ok(parts[0].length <= 200);
});

test("parseGtx joins Google Translate segments", () => {
  assert.equal(parseGtx([[["Olá ", "Hello"], ["mundo", "world"]]]), "Olá mundo");
  assert.equal(parseGtx(null), "");
});

test("loadStory hydrates the full post before the list stub", () => {
  const src = read("src/lib/news/server-news.ts");
  const fn = src.slice(src.indexOf("export const loadStory"));
  assert.match(fn, /downloadPostById/);
  assert.match(fn, /hydrateStory/);
  assert.ok(fn.indexOf("downloadPostById") < fn.indexOf("peekStory"));
});

test("ArticleView shows avatar and hides a duplicated title", () => {
  const src = read("src/components/news/article-view.tsx");
  assert.match(src, /story\.avatar|face/);
  assert.match(src, /isDistinctTitle/);
  assert.match(src, /whitespace-pre-wrap/);
  assert.match(src, /rounded-full/);
});
