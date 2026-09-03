import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { extractYouTubeId } from "../src/lib/news/youtube-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

test("extractYouTubeId strips yt_ prefix and handles watch URLs and raw IDs", () => {
  assert.equal(extractYouTubeId("ROF2Nv_KjOM"), "ROF2Nv_KjOM");
  assert.equal(extractYouTubeId("yt_ROF2Nv_KjOM"), "ROF2Nv_KjOM");
  assert.equal(extractYouTubeId("https://www.youtube.com/watch?v=ROF2Nv_KjOM"), "ROF2Nv_KjOM");
  assert.equal(extractYouTubeId("https://youtu.be/ROF2Nv_KjOM"), "ROF2Nv_KjOM");
});

test("ArticleView does not wrap YouTube/video assets with unconditional data-media that hides under data-images=off", () => {
  const article = read("src/components/news/article-view.tsx");
  // O wrapper de mídia não pode ter data-media incondicional que oculte o player de vídeo
  assert.doesNotMatch(
    article,
    /<div\s+data-media=""\s*>\s*\{assets\.map/,
    "ArticleView não pode ter <div data-media=''> englobando todos os assets indiscriminadamente",
  );
  // Deve aplicar data-media somente para fotos (photo)
  assert.match(
    article,
    /data-media=\{asset\.type === ["']photo["']/,
    "data-media deve ser aplicado apenas em assets do tipo photo",
  );
});

test("styles.css protects video media when data-images=off", () => {
  const css = read("src/styles.css");
  assert.match(css, /html\[data-images="off"\] \[data-media\]/);
  // Não pode esconder [data-media="video"]
  assert.match(css, /html\[data-images="off"\] \[data-media\]:not\(\[data-media="video"\]\)/);
});
