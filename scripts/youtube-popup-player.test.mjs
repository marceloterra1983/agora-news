import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

test("YouTube iframe overrides document same-origin so embeds send an origin Referer", () => {
  const embed = read("src/components/news/youtube-embed.tsx");
  const iframe = embed.match(/<iframe\b[\s\S]*?\/>/)?.[0] || embed.match(/<iframe\b[\s\S]*?<\/iframe>/)?.[0];
  assert.ok(iframe, "YouTubeEmbed precisa renderizar iframe");
  assert.match(iframe, /youtube-nocookie\.com\/embed/);
  assert.match(iframe, /referrerPolicy=["']strict-origin-when-cross-origin["']/);
  assert.doesNotMatch(iframe, /referrerPolicy=["'](?:same-origin|no-referrer)["']/);
});

test("popup still hydrates a YouTube asset and autoplays the player", () => {
  const article = read("src/components/news/article-view.tsx");
  const popup = read("src/components/news/feed-story-popup.tsx");
  assert.match(popup, /<ArticleView story=\{story\} embedded/);
  assert.match(article, /type:\s*["']youtube["']/);
  assert.match(article, /<StoryAssetBlock[\s\S]*?autoPlay=\{embedded\}/);
});

test("document referrer stays same-origin so X <video> CDN is not sent a site Referer", () => {
  const src = read("src/routes/__root.tsx");
  assert.match(src, /["']Referrer-Policy["']\s*:\s*["']same-origin["']/);
  assert.match(
    src,
    /name:\s*["']referrer["'][\s\S]{0,80}content:\s*["']same-origin["']/,
  );
});
