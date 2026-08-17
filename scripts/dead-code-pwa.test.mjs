import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { injectGrokPwaHead } from "./grok-pwa-shared.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const DEAD = [
  "src/lib/news/rss.ts",
  "src/lib/news/catalog.ts",
  "src/lib/news/catalog.json",
  "src/lib/multiplayer/p2p.ts",
  "src/lib/multiplayer/index.ts",
  "src/components/news/hero.tsx",
  "src/components/news/masthead.tsx",
  "src/components/news/ticker.tsx",
  "src/components/news/theme-toggle.tsx",
  "src/components/ui/badge.tsx",
  "src/components/ui/separator.tsx",
  "src/sw-register.js",
  "public/agora-feed.csv",
];

test("dead journal modules and unused UI are gone", () => {
  for (const rel of DEAD) {
    assert.equal(existsSync(join(root, rel)), false, rel);
  }
});

test("app head declares a single Agora manifest", () => {
  const src = readFileSync(join(root, "src/routes/__root.tsx"), "utf8");
  assert.match(src, /href:\s*"\/manifest.webmanifest"/);
  assert.doesNotMatch(src, /__grok\/manifest/);
  const manifests = src.match(/rel:\s*"manifest"/g) ?? [];
  assert.equal(manifests.length, 1);
});

test("injector does not add a second manifest when the app already has one", () => {
  const html =
    '<html><head><link rel="manifest" href="/manifest.webmanifest"></head></html>';
  const out = injectGrokPwaHead(html);
  assert.equal(out.split('rel="manifest"').length - 1, 1);
  assert.doesNotMatch(out, /__grok\/manifest/);
});

test("package.json dropped unused template UI libraries", () => {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const name of [
    "cmdk",
    "sonner",
    "vaul",
    "recharts",
    "react-hook-form",
    "react-day-picker",
    "react-resizable-panels",
    "date-fns",
    "@tanstack/react-table",
    "@hookform/resolvers",
    "@radix-ui/react-dialog",
    "@radix-ui/react-select",
    "@radix-ui/react-dropdown-menu",
  ]) {
    assert.equal(deps[name], undefined, name);
  }
  assert.equal(deps["@radix-ui/react-slot"], undefined);
  assert.equal(deps["@radix-ui/react-tooltip"], undefined);
});
