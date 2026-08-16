import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function sectionNavTarget(pathname, slug) {
  if (pathname === "/fontes") return { to: "/fontes", search: { secao: slug } };
  if (pathname === "/") return { to: "/", search: { secao: slug } };
  return null;
}

test("sectionNavTarget stays on Fontes and only goes home from home", () => {
  assert.deepEqual(sectionNavTarget("/fontes", "tech"), {
    to: "/fontes",
    search: { secao: "tech" },
  });
  assert.deepEqual(sectionNavTarget("/", "brasil"), {
    to: "/",
    search: { secao: "brasil" },
  });
  assert.equal(sectionNavTarget("/buscar", "tech"), null);
  assert.equal(sectionNavTarget("/salvos", "ai"), null);
  assert.equal(sectionNavTarget("/configuracoes", "brasil"), null);
});

test("section-pref implements the same stay-on-page table", () => {
  const src = readFileSync(join(root, "src/lib/news/section-pref.ts"), "utf8");
  assert.match(src, /LAST_SECTION_KEY = "agora-last-secao"/);
  assert.match(src, /pathname === "\/fontes"/);
  assert.match(src, /pathname === "\/"/);
  assert.match(src, /return null/);
  assert.match(src, /export function readLastSection/);
  assert.match(src, /export function writeLastSection/);
});

test("chrome uses section helpers instead of hardcoding home", () => {
  const chrome = readFileSync(join(root, "src/components/news/app-chrome.tsx"), "utf8");
  assert.match(chrome, /sectionNavTarget/);
  assert.match(chrome, /readLastSection/);
  assert.match(chrome, /writeLastSection/);
  assert.doesNotMatch(chrome, /navigate\(\{\s*to:\s*"\/"/);
});

test("Todos selected chip is not paper-on-paper", () => {
  const chrome = readFileSync(join(root, "src/components/news/app-chrome.tsx"), "utf8");
  assert.doesNotMatch(chrome, /group === "all" \? "bg-paper text-ink"/);
  assert.match(chrome, /group === "all" \? "bg-paper-2 text-ink ring-1 ring-ink\/25"/);
});
