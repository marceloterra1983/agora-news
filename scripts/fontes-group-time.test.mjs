import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../src/routes/fontes.tsx"),
  "utf8",
);

test("group latest time sits after the title, not pushed to the right", () => {
  const header = src.slice(src.indexOf("data-fonte-group"), src.indexOf("<ChevronDown"));
  const label = header.indexOf("{g.label}");
  const time = header.indexOf("relativeTime(g.latest)");
  assert.ok(label > 0 && time > label);
  const stamp = header.slice(header.indexOf("<time"), header.indexOf("</time>"));
  assert.match(stamp, /dateTime=\{g\.latest\}/);
  assert.doesNotMatch(stamp, /ml-auto/);
});
