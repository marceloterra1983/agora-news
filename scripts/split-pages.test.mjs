import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function lines(rel) {
  return readFileSync(join(root, rel), "utf8").split("\n").length;
}

test("buscar and fontes routes stay under 300 lines", () => {
  assert.ok(lines("src/routes/buscar.tsx") <= 300, `buscar.tsx is ${lines("src/routes/buscar.tsx")}`);
  assert.ok(lines("src/routes/fontes.tsx") <= 300, `fontes.tsx is ${lines("src/routes/fontes.tsx")}`);
  assert.ok(lines("src/routes/configuracoes.tsx") <= 300, `configuracoes.tsx is ${lines("src/routes/configuracoes.tsx")}`);
});

test("extracted page modules stay under 200 lines", () => {
  for (const rel of [
    "src/components/news/x-hit-row.tsx",
    "src/components/news/x-profile-card.tsx",
    "src/components/news/fontes-chip.tsx",
    "src/components/news/fontes-profile-row.tsx",
    "src/components/news/fontes-closed-post.tsx",
    "src/components/news/fontes-profile-er.tsx",
    "src/components/news/fontes-batch-bar.tsx",
    "src/lib/news/groups.ts",
    "src/lib/news/fonte-metrics.ts",
    "src/lib/news/last-post.ts",
    "src/lib/news/last-post-store.ts",
    "src/components/news/buscar-hit-list.tsx",
    "src/components/news/buscar-interests.tsx",
    "src/lib/news/fontes-sort.ts",
    "src/lib/news/use-open-x-profile.ts",
    "src/lib/news/server-news.ts",
    "src/lib/news/server-fontes.ts",
    "src/lib/news/server-profile.ts",
    "src/lib/news/server-debug.ts",
    "src/lib/news/summary-core.mjs",
    "src/lib/news/summary-line.ts",
  ]) {
    assert.ok(lines(rel) <= 200, `${rel} is ${lines(rel)}`);
  }
});

test("server.ts is a barrel under 80 lines", () => {
  assert.ok(lines("src/lib/news/server.ts") <= 80, `server.ts is ${lines("src/lib/news/server.ts")}`);
  const src = readFileSync(join(root, "src/lib/news/server.ts"), "utf8");
  assert.match(src, /from ["']\.\/server-news["']/);
  assert.match(src, /from ["']\.\/server-fontes["']/);
  assert.match(src, /from ["']\.\/server-profile["']/);
  assert.doesNotMatch(src, /createServerFn/);
});

test("route files no longer define HitRow/ProfileCard/ProfileRow", () => {
  const buscar = readFileSync(join(root, "src/routes/buscar.tsx"), "utf8");
  const fontes = readFileSync(join(root, "src/routes/fontes.tsx"), "utf8");
  assert.doesNotMatch(buscar, /function HitRow/);
  assert.doesNotMatch(buscar, /function ProfileCard/);
  assert.doesNotMatch(fontes, /function ProfileRow/);
  assert.doesNotMatch(fontes, /function Chip/);
  assert.match(buscar, /from "@\/components\/news\/buscar-hit-list"/);
  assert.match(buscar, /from "@\/components\/news\/buscar-interests"/);
  assert.match(fontes, /from "@\/components\/news\/fontes-profile-row"/);
  assert.match(fontes, /from "@\/components\/news\/fontes-chip"/);
});
