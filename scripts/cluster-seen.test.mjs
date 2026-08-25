import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  CLUSTER_SEEN_KEY,
  freshMemberCount,
  freshMemberCountFor,
  markClusterSeen,
} from "../src/lib/news/cluster-seen.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const memory = new Map();
const storage = {
  getItem: (key) => (memory.has(key) ? memory.get(key) : null),
  setItem: (key, value) => memory.set(key, String(value)),
};

test("first view is zero; new member counts; mark clears", () => {
  memory.clear();
  assert.equal(freshMemberCount(undefined, ["a", "b"]), 0);
  assert.equal(freshMemberCountFor("c1", ["a", "b"], storage), 0);
  markClusterSeen("c1", ["a", "b"], storage);
  assert.equal(freshMemberCountFor("c1", ["a", "b"], storage), 0);
  assert.equal(freshMemberCountFor("c1", ["a", "b", "n"], storage), 1);
  markClusterSeen("c1", ["a", "b", "n"], storage);
  assert.equal(freshMemberCountFor("c1", ["a", "b", "n"], storage), 0);
  assert.equal(JSON.parse(memory.get(CLUSTER_SEEN_KEY)).c1.length, 3);
});

test("card copy is wired", () => {
  const card = readFileSync(join(root, "src/components/news/story-card.tsx"), "utf8");
  assert.match(card, /Também/);
  assert.match(card, /fontes novas/);
  assert.match(card, /alsoFrom/);
});
