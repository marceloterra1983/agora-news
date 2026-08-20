import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { CRITICAL_CSS } from "../src/lib/news/critical.css.ts";
import { liveSmokeUrl, unavailable } from "./required-smoke.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

async function live(base) {
  try {
    const response = await fetch(`${base}/api/health/live`, {
      signal: AbortSignal.timeout(2_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

test("CSS: critical fallback is bounded", () => {
  assert.ok(
    Buffer.byteLength(CRITICAL_CSS) <= 3_000,
    `critical CSS: ${Buffer.byteLength(CRITICAL_CSS)} bytes`,
  );
  assert.doesNotMatch(
    read("src/lib/news/critical.css.ts"),
    /\?raw|phone-layout/,
  );
});

test("CSS: full styles are one shared hashed asset", () => {
  const route = read("src/routes/__root.tsx");
  assert.match(route, /import ["']\.\.\/styles\.css["']/);
  assert.doesNotMatch(route, /styles\.css\?(?:inline|url)|appCss/);
  assert.doesNotMatch(read("src/styles.css"), /tw-animate-css/);
  assert.match(
    read("scripts/ci-release-smoke.sh"),
    /CI_ARTIFACT_GATES=1[\s\S]*npm test/,
  );

  if (process.env.CI_ARTIFACT_GATES !== "1") return;
  const assets = join(root, ".output/public/assets");
  assert.equal(
    existsSync(assets),
    true,
    "execute npm run build before this gate",
  );
  const css = readdirSync(assets).filter((name) => name.endsWith(".css"));
  assert.equal(css.length, 1, `CSS assets: ${css.join(", ") || "none"}`);
  assert.match(css[0], /-[A-Za-z0-9_-]{6,}\.css$/);
  const body = readFileSync(join(assets, css[0]));
  assert.ok(body.byteLength <= 50_000, `full CSS: ${body.byteLength} bytes`);
  assert.ok(gzipSync(body).byteLength <= 10_000, "full CSS gzip budget");
});

test("served routes reuse the immutable CSS asset and native menu hint", async (t) => {
  const base = liveSmokeUrl(t);
  if (!base) return;
  if (!(await live(base))) {
    unavailable(t, `smoke precisa de ${base} no ar`);
    return;
  }

  const responses = await Promise.all([
    fetch(`${base}/?secao=ai`),
    fetch(`${base}/fontes?secao=ai`),
  ]);
  const html = await Promise.all(
    responses.map(async (response) => {
      assert.ok(response.ok, `status ${response.status}`);
      return response.text();
    }),
  );
  const assetHref = (document) =>
    [...document.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)]
      .map(([tag]) => tag.match(/href="([^"]+)"/)?.[1])
      .find((href) => /^\/assets\/[^/]+-[A-Za-z0-9_-]{6,}\.css$/.test(href ?? ""));
  const hrefs = html.map(assetHref);
  assert.ok(hrefs[0], "shared CSS ausente");
  assert.deepEqual(hrefs, [hrefs[0], hrefs[0]]);
  for (const document of html) {
    const inlineBytes = [...document.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
      .reduce((sum, match) => sum + Buffer.byteLength(match[1]), 0);
    assert.ok(inlineBytes <= 3_000, `inline CSS: ${inlineBytes} bytes`);
  }

  const css = await fetch(new URL(hrefs[0], base));
  assert.ok(css.ok, `CSS status ${css.status}`);
  assert.match(css.headers.get("content-type") ?? "", /text\/css/);
  assert.match(css.headers.get("cache-control") ?? "", /immutable/);

  const { chromium } = await import("playwright");
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
  } catch (error) {
    if (/Executable doesn't exist/i.test(String(error))) {
      unavailable(t, "Playwright Chromium ausente");
      return;
    }
    throw error;
  }
  try {
    const page = await browser.newPage();
    await page.goto(`${base}/?secao=ai`, { waitUntil: "networkidle" });
    const menu = page.getByRole("button", { name: "Menu", exact: true });
    assert.equal(await menu.getAttribute("title"), "Menu");
    await menu.click();
    const close = page.getByRole("button", {
      name: "Fechar menu",
      exact: true,
    });
    assert.equal(await close.getAttribute("title"), "Fechar menu");
    assert.equal(await page.locator('[role="tooltip"]').count(), 0);
  } finally {
    await browser.close();
  }
});

test("Tip and Button use native behavior without UI wrapper dependencies", () => {
  const icon = read("src/components/news/icon-btn.tsx");
  const pwa = read("src/components/news/pwa-install.tsx");
  const route = read("src/routes/__root.tsx");
  assert.match(icon, /cloneElement/);
  assert.match(icon, /title/);
  assert.doesNotMatch(icon, /Tooltip|useState|setTimeout|onTouch/);
  assert.doesNotMatch(route, /TooltipProvider|components\/ui\/tooltip/);
  assert.doesNotMatch(pwa, /components\/ui\/button|<Button/);
  assert.match(pwa, /<button[\s\S]*aria-label=["']Instalar o Agora["']/);

  for (const path of [
    "src/components/ui/tooltip.tsx",
    "src/components/ui/button.tsx",
  ]) {
    assert.equal(existsSync(join(root, path)), false, path);
  }

  const pkg = JSON.parse(read("package.json"));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const name of [
    "@radix-ui/react-slot",
    "@radix-ui/react-tooltip",
    "class-variance-authority",
    "tw-animate-css",
  ]) {
    assert.equal(deps[name], undefined, name);
  }

  const iconBytes = Buffer.byteLength(icon, "utf8");
  assert.ok(iconBytes <= 3_000, `icon-btn.tsx is ${iconBytes} B`);

  const built = join(root, ".output/public/assets");
  if (process.env.CI_ARTIFACT_GATES === "1") {
    assert.equal(existsSync(built), true, "execute npm run build before this gate");
    // Vite may name a shared client chunk icon-btn-*.js; that filename is not
    // the 1.5 KB module. The real contracts are source size + no Radix in _libs.
    const legacyUi = readdirSync(join(root, ".output/server/_libs")).filter(
      (name) => /radix|floating-ui|class-variance-authority/.test(name),
    );
    assert.deepEqual(legacyUi, []);
  }
});

test("poll and cache: one React Query timer and one server SWR remain", () => {
  const client = read("src/components/news/feed.tsx");
  const feed = read("src/lib/news/feed.ts");
  const supabase = read("src/lib/news/supabase.ts");
  const ingest = read("src/lib/news/ingest.ts");
  const cache = read("src/lib/news/cache.ts");
  assert.equal((client.match(/refetchInterval/g) ?? []).length, 1);
  assert.match(client, /refetchInterval:\s*60_000/);
  assert.doesNotMatch(client, /setInterval|SUPABASE_POSTS_URL/);
  assert.match(client, /const seed = initial \?\? newsFromFallback/);
  assert.match(client, /data\?\.stories \?\? seed\.stories/);
  assert.doesNotMatch(client, /stories\.length \? .*stories : seed\.stories/);
  assert.doesNotMatch(
    feed,
    /SOFT_MS|HARD_MS|\binflight\b|loadXStories|\bfromX\b/,
  );
  assert.match(supabase, /listCache/);
  assert.match(supabase, /listInflight/);
  assert.doesNotMatch(supabase, /CACHE_KEYS\.list|cacheSetJson/);
  assert.doesNotMatch(ingest, /CACHE_KEYS\.list|cloudKvSet|storiesFromDbPosts/);
  assert.doesNotMatch(cache, /list:\s*\(|agora:v2:list/);
  assert.equal(existsSync(join(root, "src/lib/news/cloud-kv.ts")), false);
  assert.match(read("src/lib/news/fonte-buzz-store.ts"), /cache(Get|Set)Json/);
});

test("dead paths and direct dependencies are removed only with zero consumers", () => {
  for (const path of [
    "src/lib/auth/gates.tsx",
    "src/lib/news/x-search.ts",
    "src/lib/news/sheet.ts",
    "src/lib/news/refs.ts",
  ]) {
    assert.equal(existsSync(join(root, path)), false, path);
  }
  assert.doesNotMatch(
    read("src/lib/news/feed.ts"),
    /listFallback(Stories|Categories)/,
  );
  assert.doesNotMatch(
    read("src/lib/news/supabase.ts"),
    /probeSupabase|storiesFromDbPosts/,
  );
  assert.doesNotMatch(read("src/lib/news/server-fontes.ts"), /loadFontesLive/);
  assert.doesNotMatch(
    read("src/lib/news/influence.ts"),
    /export async function (?:enrichFontes|loadInfluence)\s*\(/,
  );

  const pkg = JSON.parse(read("package.json"));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const name of [
    "@tanstack/router-plugin",
    "eslint-plugin-prettier",
    "lightningcss",
  ]) {
    assert.equal(deps[name], undefined, name);
  }
  assert.ok(
    Object.keys(deps).length <= 34,
    `${Object.keys(deps).length} direct packages`,
  );

  assert.doesNotMatch(read("src/lib/news/fontes-prefs.ts"), /void GROUP_KEY/);
  assert.doesNotMatch(read("src/lib/news/groups.ts"), /void CUSTOM_KEY/);

  for (const [path, pattern] of [
    ["src/lib/news/types.ts", /export const FALLBACK_CATEGORIES/],
    ["src/lib/news/profiles.ts", /export const GROUP_HINTS|export function profileGroups/],
    ["src/lib/news/x-media.ts", /export async function (?:assetsForStory|enrichStoryMedia)/],
    ["src/lib/news/groups.ts", /export function groupChipStyle/],
    ["src/lib/news/extra-fontes.ts", /export function isExtraFonte/],
    ["src/lib/news/fontes-prefs.ts", /export function (?:isNotifyHandle|toggleNotifyHandle)/],
    ["src/lib/news/format.ts", /export function (?:longDate|mastheadDate)/],
    ["src/lib/news/settings.ts", /export function typefaceHref/],
    ["src/lib/news/store.ts", /export function savedStories/],
    ["src/lib/auth/server.ts", /export function readSessionToken/],
    ["src/lib/auth/use-current-user.ts", /export function useCurrentUser\(/],
  ]) {
    assert.doesNotMatch(read(path), pattern, `${path} zero-consumer export`);
  }
});

test("documentation describes the verified Docker and persistence path", () => {
  const architecture = read("specs/tech-architecture/tech-stack.md");
  const runbook = read("docs/production-runbook.md");
  const references = read("src/routes/referencias.tsx");
  assert.match(architecture, /Docker[\s\S]*Nitro/);
  assert.match(
    architecture,
    /x_profiles[\s\S]*user_watches[\s\S]*user_prefs[\s\S]*push_subscriptions/,
  );
  assert.doesNotMatch(
    architecture,
    /PM2\s+`?vite dev|PGLite in-memory|caller anônimo|god-table|não rotacionar|fallback no source/i,
  );
  assert.match(runbook, /supabase-domain-tables\.sql/);
  assert.match(runbook, /supabase-private-persistence-migrate\.sql/);
  assert.match(runbook, /\/api\/health\/live/);
  assert.doesNotMatch(
    references,
    /Google|Drive|planilha|sheetId|NEWS_AI_FOLDER|allCrossRefs/i,
  );
});
