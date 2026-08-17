import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { lastPostIsStale, LAST_POST_STALE_MS } from "../src/lib/news/last-post-core.mjs";
import { applyPushSubscribeResult } from "../src/lib/news/notify-core.mjs";
import { PAGE_SIZE } from "../src/lib/news/page-size.mjs";
import { extrasForSection, parseWatchSection } from "../src/lib/news/watch-section.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

test("PAGE_SIZE is 40 and the feed/list/hasMore share it", () => {
  assert.equal(PAGE_SIZE, 40);
  assert.match(read("src/lib/news/feed.ts"), /PAGE_SIZE/);
  assert.match(read("src/lib/news/server-news.ts"), /PAGE_SIZE/);
  assert.match(read("src/components/news/feed.tsx"), /PAGE_SIZE/);
  assert.match(read("src/lib/news/supabase.ts"), /PAGE_SIZE/);
  assert.doesNotMatch(read("src/lib/news/feed.ts"), /FIRST_LIMIT\s*=\s*24/);
  assert.doesNotMatch(read("src/lib/news/server-news.ts"), />= 40/);
  const feed = read("src/components/news/feed.tsx");
  assert.match(feed, /aria-label="Carregar mais"/);
  assert.doesNotMatch(feed, /Tip label="Carregar mais"/);
});

test("watch extras without a matching section stay out of IA", () => {
  assert.deepEqual(
    extrasForSection(
      [
        { handle: "RenanSantosMBL", section: "brasil" },
        { handle: "ylecun", section: "ai" },
        { handle: "orphan" },
      ],
      "ai",
    ).map((e) => e.handle),
    ["ylecun"],
  );
  assert.equal(parseWatchSection({ batch_name: "x-watch:brasil", source: "x-watch" }), "brasil");
  assert.equal(parseWatchSection({ batch_name: "x-watch", source: "x-watch" }), "");
  assert.match(read("src/lib/news/extra-fontes.ts"), /extrasForSection/);
  assert.doesNotMatch(
    read("src/lib/news/influence.ts"),
    /list(All|User)WatchAccounts/,
  );
  assert.match(read("src/lib/news/server-profile.ts"), /allProfiles\(\)/);
  assert.doesNotMatch(read("src/lib/news/server-profile.ts"), /profilesFor\(\)\.map/);
});

test("inApp is true only when the last tweet id is in the section feed map", () => {
  const src = read("src/lib/news/influence.ts");
  assert.match(src, /fromFeed/);
  assert.match(src, /fromFeed\.id === last\.id/);
  assert.match(src, /feedMap|feed:/);
});

test("ingest translates the full post and keeps QT out of content", () => {
  const src = read("src/lib/news/ingest.ts");
  assert.match(src, /translateToPt\(content/);
  assert.doesNotMatch(src, /content: `\$\{content\}\$\{quoteBit\}`/);
  assert.doesNotMatch(src, /translateToPt\(`\$\{content\}/);
  assert.match(src, /persistedRows/);
  assert.match(src, /written\.ok/);
  const route = read("src/routes/api/ingest.ts");
  assert.match(route, /result\.ok \? 200 : 502/);
});

test("subscribeWebPush only marks subscribed on HTTP 2xx", () => {
  assert.equal(applyPushSubscribeResult(true), true);
  assert.equal(applyPushSubscribeResult(false), false);
  const src = read("src/lib/news/notify-favorites.ts");
  assert.match(src, /res\.ok/);
  assert.match(src, /applyPushSubscribeResult/);
  assert.match(src, /unsubscribeWebPush|method:\s*["']DELETE["']/);
});

test("stale x-last older than 14 days is refreshed", () => {
  const old = { publishedAt: "2023-01-01T00:00:00.000Z" };
  const fresh = { publishedAt: new Date().toISOString() };
  assert.equal(lastPostIsStale(old), true);
  assert.equal(lastPostIsStale(fresh), false);
  assert.ok(LAST_POST_STALE_MS >= 14 * 24 * 60 * 60_000);
  assert.match(read("src/lib/news/last-post-store.ts"), /lastPostIsStale/);
});

test("buzz fetch uses the card tweet id, not only rows\\[0\\]", () => {
  const src = read("src/lib/news/fonte-metrics.ts");
  assert.match(src, /tweetId/);
  assert.match(src, /fetchLastBuzz\(handle/);
  assert.match(read("src/lib/news/influence.ts"), /fetchLastBuzz\(r\.handle,\s*r\.lastPost/);
});

test("reader card has avatar, word ellipsis and no-referrer on the header face", () => {
  const card = read("src/components/news/story-card.tsx");
  const article = read("src/components/news/article-view.tsx");
  assert.match(card, /story\.avatar|rounded-full/);
  assert.match(card, /referrerPolicy/);
  assert.match(article, /referrerPolicy=["']no-referrer["']/);
  assert.match(read("src/lib/news/format.ts"), /clipAtWord/);
});

test("unread mark is the left stripe only, without a Novo chip", () => {
  const card = read("src/components/news/story-card.tsx");
  assert.match(card, /data-unread-mark=""/);
  assert.match(card, /Não lida/);
  assert.match(card, /absolute bottom-6 left-0 top-6 w-0\.5 rounded-full bg-mark/);
  assert.doesNotMatch(card, />\s*Novo\s*</);
  assert.doesNotMatch(card, /text-mark-fg/);
});
