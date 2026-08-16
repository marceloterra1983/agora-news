import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../src/components/news/fontes-profile-row.tsx"),
  "utf8",
);

test("FonteControls render only inside the open Fontes card, next to X", () => {
  const header = src.slice(0, src.indexOf("{open ?"));
  assert.doesNotMatch(header, /<FonteControls/);
  const card = src.slice(src.indexOf("{open ?"));
  assert.match(card, /<FonteControls/);
  assert.match(card, /<XLogo/);
  assert.ok(
    card.indexOf("<XLogo") < card.indexOf("<FonteControls"),
    "X should sit left of the three controls in the open card footer",
  );
});
