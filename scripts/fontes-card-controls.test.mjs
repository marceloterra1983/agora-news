import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../src/components/news/fontes-profile-row.tsx"),
  "utf8",
);

test("closed Fontes row keeps star/bell/power; open card moves them next to X", () => {
  assert.match(src, /\{!open \?[\s\S]*<FonteControls[\s\S]*: null\}/);
  const card = src.slice(src.indexOf("{open ?"));
  assert.match(card, /<FonteControls/);
  assert.match(card, /<XLogo/);
  assert.ok(
    card.indexOf("<XLogo") < card.indexOf("<FonteControls"),
    "X should sit left of the three controls in the open card footer",
  );
});
