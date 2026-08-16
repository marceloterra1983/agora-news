import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  OUTLIER,
  isHighPostEr,
  isHighPostQuality,
  isHighPostReach,
} from "../src/lib/news/metric-outlier.mjs";
import { formatPostEr, formatPostQuality, formatPostReach } from "../src/lib/news/fonte-metrics.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("outlier floors are the documented X baselines", () => {
  assert.equal(OUTLIER.er.floorPct, 3);
  assert.equal(OUTLIER.er.vsProfile, 2);
  assert.equal(OUTLIER.reach.floorRatio, 0.75);
  assert.equal(OUTLIER.reach.minViews, 200);
  assert.equal(OUTLIER.quality.floorPct, 25);
  assert.equal(OUTLIER.quality.minLikes, 20);
});

test("ER 0,35% stays hidden; 3%+ or 2× profileEr shows", () => {
  assert.equal(isHighPostEr({ er: 0.35 }, 1.2), false);
  assert.equal(isHighPostEr({ er: 2.4 }, 1.2), false);
  assert.equal(isHighPostEr({ er: 3.2 }, 1.2), true);
  assert.equal(isHighPostEr({ er: 5 }, 3), false);
  assert.equal(isHighPostEr({ er: 6 }, 3), true);
  assert.equal(isHighPostEr({ er: 0 }, 5), false);
  assert.equal(formatPostEr({ er: 0.35 }, 1.2), "");
  assert.match(formatPostEr({ er: 3.2 }, 1.2), /3/);
});

test("reach 4% and 25% stay hidden; 75%+ of followers or 1× shows", () => {
  assert.equal(isHighPostReach({ views: 400 }, 10_000), false);
  assert.equal(isHighPostReach({ views: 2_500 }, 10_000), false);
  assert.equal(isHighPostReach({ views: 7_500 }, 10_000), true);
  assert.equal(isHighPostReach({ views: 12_000 }, 10_000), true);
  assert.equal(isHighPostReach({ views: 80 }, 10_000), false);
  assert.equal(formatPostReach({ views: 400 }, 10_000), "");
  assert.equal(formatPostReach({ views: 2_500 }, 10_000), "");
  assert.match(formatPostReach({ views: 7_500 }, 10_000), /75/);
  assert.match(formatPostReach({ views: 12_000 }, 10_000), /×/);
});

test("quality 16% stays hidden; 25% replies/likes with enough likes shows", () => {
  assert.equal(isHighPostQuality({ replies: 16, likes: 100 }), false);
  assert.equal(isHighPostQuality({ replies: 25, likes: 100 }), true);
  assert.equal(isHighPostQuality({ replies: 8, likes: 10 }), false);
  assert.equal(formatPostQuality({ replies: 16, likes: 100 }), "");
  assert.match(formatPostQuality({ replies: 25, likes: 100 }), /25/);
});

test("Fontes row passes profileEr into formatPostEr", () => {
  const src = readFileSync(join(root, "src/components/news/fontes-profile-row.tsx"), "utf8");
  assert.match(src, /formatPostEr\(row\.lastPost,\s*row\.er\)/);
});
