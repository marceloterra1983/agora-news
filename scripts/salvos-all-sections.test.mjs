import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { groupSavedByCategory } from "../src/lib/news/saved-groups.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

test("salvos de todas as seções aparecem, agrupados na ordem conhecida", () => {
  const items = [
    { id: "a", category: "tech" },
    { id: "b", category: "ai" },
    { id: "c", category: "tech" },
    { id: "d", category: "curiosidades" },
  ];
  const groups = groupSavedByCategory(items, ["ai", "tech", "brasil"]);
  assert.deepEqual(
    groups.map((g) => g.category),
    ["ai", "tech", "curiosidades"],
  );
  assert.deepEqual(
    groups.flatMap((g) => g.items.map((i) => i.id)),
    ["b", "a", "c", "d"],
  );
  assert.equal(groups.reduce((n, g) => n + g.items.length, 0), items.length);
});

test("categoria fora da ordem conhecida não some nem reordena as conhecidas", () => {
  const groups = groupSavedByCategory(
    [{ id: "x", category: "watch" }],
    ["ai", "tech", "brasil"],
  );
  assert.deepEqual(groups, [{ category: "watch", items: [{ id: "x", category: "watch" }] }]);
  assert.deepEqual(groupSavedByCategory([], ["ai"]), []);
});

test("a rota Salvos não filtra pela seção aberta e titula cada grupo", () => {
  const page = read("src/routes/salvos.tsx");
  assert.doesNotMatch(page, /category\)\s*===\s*secao/);
  assert.match(page, /groupSavedByCategory/);
  assert.match(page, /labelFor\(g\.category\)/);
  assert.doesNotMatch(page, /guardadas neste tema/);
});
