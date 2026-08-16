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

test("closed last post is a link outside the leftover expand button", () => {
  const header = src.slice(0, src.indexOf("{open ?"));
  const btnStart = header.indexOf("<button");
  const btnEnd = header.indexOf("</button>");
  assert.ok(btnStart >= 0 && btnEnd > btnStart, "closed row still has an expand button");
  const button = header.slice(btnStart, btnEnd);
  assert.match(button, /aria-expanded=\{open\}/);
  assert.match(button, /ml-auto/);
  assert.doesNotMatch(button, /displayTitle\(row\.lastPost/);
  assert.doesNotMatch(button, /lastPost\?\.title/);
  const after = header.slice(btnEnd);
  assert.match(after, /<a\b/);
  assert.match(after, /lastHref/);
  assert.match(after, /data-testid=["']fonte-last-post["']/);
  assert.match(button, /min-h-\[44px\]/);
  assert.match(after, /min-h-\[44px\]/);
});
