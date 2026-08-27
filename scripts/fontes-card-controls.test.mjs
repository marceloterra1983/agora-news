import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(
  join(root, "../src/components/news/fontes-profile-row.tsx"),
  "utf8",
);
const shared = readFileSync(
  join(root, "../src/components/news/fonte-profile-card.tsx"),
  "utf8",
);

test("FonteControls render only inside the open Fontes card, next to X", () => {
  const header = src.slice(0, src.indexOf("{open ?"));
  assert.doesNotMatch(header, /<FonteControls/);
  const open = src.slice(src.indexOf("{open ?"));
  assert.match(open, /<FonteProfileCard/);
  assert.match(shared, /<FonteControls/);
  assert.match(shared, /<XLogo/);
  assert.ok(
    shared.indexOf("<XLogo") < shared.indexOf("<FonteControls"),
    "X should sit left of the three controls in the open card footer",
  );
});

test("closed row time sits immediately after the group tag, not under the title", () => {
  const header = src.slice(src.indexOf("<button"), src.indexOf("</button>"));
  const time = header.indexOf("relativeTime(row.lastPost.publishedAt)");
  const tag = header.indexOf("<GroupTag");
  assert.ok(tag > 0 && time > tag, "time must follow GroupTag in the Fontes header");
  const meta = readFileSync(join(root, "../src/components/news/fontes-closed-post.tsx"), "utf8");
  assert.doesNotMatch(meta, /relativeTime/);
});

test("closed last post is a link outside the leftover expand button", () => {
  const header = src.slice(0, src.indexOf("{open ?"));
  const btnStart = header.indexOf("<button");
  const btnEnd = header.indexOf("</button>");
  assert.ok(btnStart >= 0 && btnEnd > btnStart, "closed row still has an expand button");
  const button = header.slice(btnStart, btnEnd);
  assert.match(button, /aria-expanded=\{picking \? undefined : open\}/);
  assert.match(button, /aria-pressed=\{picking \? Boolean\(picked\) : undefined\}/);
  assert.match(button, /ml-auto/);
  assert.doesNotMatch(button, /displayTitle\(row\.lastPost/);
  assert.doesNotMatch(button, /lastPost\?\.title/);
  const after = header.slice(btnEnd);
  assert.match(after, /FontePostLink|<a\b/);
  assert.match(after, /lastHref/);
  assert.match(after, /data-testid=["']fonte-last-post["']/);
  assert.match(button, /min-h-\[44px\]/);
  assert.match(after, /min-h-\[44px\]/);
});
