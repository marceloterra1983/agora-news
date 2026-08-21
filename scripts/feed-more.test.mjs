import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  FEED_MORE_HOURS,
  FEED_MORE_WIDE_HOURS,
  intersectAccounts,
  moreStillOpen,
  nextMoreHours,
  postedAtQuery,
  shouldWalkEmptyWindow,
  storyHasText,
  windowAfter,
} from "../src/lib/news/feed-more.mjs";
import {
  nextShownByHours,
  visibleProfilePosts,
} from "../src/lib/news/profile-last.mjs";
import { catalogFor, handlesForGroup } from "../src/lib/news/section-catalog.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

test("windowAfter is 12 hours before the last published post", () => {
  assert.equal(windowAfter("2026-08-21T15:00:00.000Z"), "2026-08-21T03:00:00.000Z");
  assert.equal(windowAfter("2026-08-21T15:00:00.000Z", FEED_MORE_HOURS), "2026-08-21T03:00:00.000Z");
  assert.equal(windowAfter("nope"), "");
});

test("postedAtQuery uses lt, gte or an and-range", () => {
  assert.deepEqual(postedAtQuery({ before: "2026-08-21T15:00:00.000Z" }), {
    posted_at: "lt.2026-08-21T15:00:00.000Z",
  });
  assert.deepEqual(postedAtQuery({ after: "2026-08-21T03:00:00.000Z" }), {
    posted_at: "gte.2026-08-21T03:00:00.000Z",
  });
  assert.deepEqual(
    postedAtQuery({
      before: "2026-08-21T15:00:00.000Z",
      after: "2026-08-21T03:00:00.000Z",
    }),
    { and: "(posted_at.lt.2026-08-21T15:00:00.000Z,posted_at.gte.2026-08-21T03:00:00.000Z)" },
  );
});

test("intersectAccounts never leaves the catalog allow-list", () => {
  assert.deepEqual(intersectAccounts(["@OpenAI", "verge"], ["openai", "sama"]), ["openai"]);
  assert.deepEqual(intersectAccounts([], ["openai"]).sort(), ["openai"]);
  assert.deepEqual(intersectAccounts(["evil"], ["openai"]), []);
});

test("storyHasText drops blank cards", () => {
  assert.equal(storyHasText({ title: "Olá", body: "" }), true);
  assert.equal(storyHasText({ title: "", body: "", excerpt: "" }), false);
  assert.equal(storyHasText({ title: "Sem título", body: "" }), false);
});

test("empty 12h window walks once so the first click is not a no-op", () => {
  assert.equal(
    shouldWalkEmptyWindow({ addedVisible: 0, freshCount: 0, serverHasMore: true, steps: 0 }),
    true,
  );
  assert.equal(
    shouldWalkEmptyWindow({ addedVisible: 2, freshCount: 2, serverHasMore: true, steps: 0 }),
    false,
  );
  assert.equal(
    shouldWalkEmptyWindow({ addedVisible: 0, freshCount: 0, serverHasMore: false, steps: 0 }),
    false,
  );
});

test("a click tries 12 hours then 24 hours before an unbounded older page", () => {
  assert.equal(nextMoreHours(0), FEED_MORE_HOURS);
  assert.equal(nextMoreHours(12), FEED_MORE_WIDE_HOURS);
  assert.equal(nextMoreHours(24), 0);
  assert.equal(windowAfter("2026-08-21T15:00:00.000Z", 24), "2026-08-20T15:00:00.000Z");
  assert.equal(
    moreStillOpen({ addedVisible: 3, hours: 12, unboundedTried: false, unboundedCount: 0 }),
    true,
  );
  assert.equal(
    moreStillOpen({ addedVisible: 0, hours: 24, unboundedTried: true, unboundedCount: 0 }),
    false,
  );
  assert.equal(
    moreStillOpen({ addedVisible: 0, hours: 24, unboundedTried: false, unboundedCount: 0 }),
    true,
  );
});

test("profile Mais opens the next 12 hours and always advances", () => {
  const posts = [
    { id: "a", publishedAt: "2026-08-21T15:00:00.000Z" },
    { id: "b", publishedAt: "2026-08-21T14:00:00.000Z" },
    { id: "c", publishedAt: "2026-08-21T10:00:00.000Z" },
    { id: "d", publishedAt: "2026-08-20T10:00:00.000Z" },
  ];
  const shown = nextShownByHours(posts, 2);
  assert.equal(shown, 3);
  assert.deepEqual(
    visibleProfilePosts(posts, shown).map((p) => p.id),
    ["a", "b", "c"],
  );
  assert.equal(nextShownByHours(posts, 3), 4);
  assert.equal(nextShownByHours(posts, 4), 4);
});

test("handlesForGroup lists only members of that group", () => {
  const ai = catalogFor("ai", {
    profiles: [
      { handle: "OpenAI", name: "OpenAI", group: "labs", section: "ai" },
      { handle: "sama", name: "Sam", group: "lideres", section: "ai" },
    ],
  });
  assert.deepEqual(handlesForGroup(ai, "labs"), ["openai"]);
  assert.deepEqual(handlesForGroup(ai, "all").sort(), ["openai", "sama"]);
});

test("feed and profile wire the 12h more button", () => {
  const feed = read("src/components/news/feed.tsx");
  const chip = read("src/components/news/fontes-last-posts.tsx");
  const news = read("src/lib/news/server-news.ts");
  assert.match(feed, /mais 12 horas/);
  assert.match(feed, /<ChevronDown/);
  assert.match(feed, /aria-label="Carregar mais"/);
  assert.match(feed, /handlesForGroup|useFeedOlder/);
  assert.match(read("src/lib/news/use-feed-older.ts"), /FEED_MORE_HOUR_STEPS|windowAfter/);
  assert.match(chip, /mais 12 horas/);
  assert.match(chip, /nextShownByHours/);
  assert.match(news, /after/);
  assert.match(news, /accounts/);
});
