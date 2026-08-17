import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  PHONE_VIEWPORT_GUARD,
  VIEWPORT_CONTENT,
} from "../src/lib/news/phone-shell.ts";
import { unavailable } from "./required-smoke.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

test("viewport contract blocks iOS shrink-to-fit on PWA overflow", () => {
  assert.match(VIEWPORT_CONTENT, /width=device-width/);
  assert.match(VIEWPORT_CONTENT, /initial-scale=1/);
  assert.match(VIEWPORT_CONTENT, /viewport-fit=cover/);
  assert.match(VIEWPORT_CONTENT, /shrink-to-fit=no/);
  assert.doesNotMatch(VIEWPORT_CONTENT, /user-scalable\s*=\s*no/i);
  assert.match(PHONE_VIEWPORT_GUARD, /shrink-to-fit=no/);
  assert.match(PHONE_VIEWPORT_GUARD, /screen\.width/);
  assert.match(PHONE_VIEWPORT_GUARD, /width="\s*\+\s*/);
});

test("phone chrome does not use 100vw/100dvw that trigger shrink-to-fit", () => {
  const css = read("src/lib/news/phone-layout.css");
  assert.doesNotMatch(css, /100vw/);
  assert.doesNotMatch(css, /100dvw/);
  assert.match(css, /html\[data-shell="phone"\]/);
  assert.match(css, /@media \(max-width: 640px\)/);
});

test("iOS standalone metas and SW update do not keep a stale phone scale", () => {
  const rootSrc = read("src/routes/__root.tsx");
  const pwa = read("src/lib/pwa.ts");
  const sw = read("public/sw.js");
  assert.match(rootSrc, /apple-mobile-web-app-capable/);
  assert.match(rootSrc, /agora-cache-bust-v1[8-9]|agora-cache-bust-v[2-9]\d/);
  assert.match(pwa, /updateViaCache:\s*["']none["']/);
  assert.match(sw, /skipWaiting/);
  assert.doesNotMatch(sw, /addEventListener\(\s*["']fetch["']/);
});

async function launchChromium(t) {
  const { chromium } = await import("playwright");
  try {
    return await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/Executable doesn't exist/i.test(msg)) {
      unavailable(
        t,
        "Playwright Chromium ausente — npx playwright install chromium",
      );
      return null;
    }
    throw err;
  }
}

test("PWA 980px layout viewport is forced to the phone CSS width", async (t) => {
  const { devices } = await import("playwright");
  const iphone = devices["iPhone 14"] ?? devices["iPhone 13"];
  const browser = await launchChromium(t);
  if (!browser) return;
  try {
    const context = await browser.newContext({
      ...iphone,
      locale: "pt-BR",
      viewport: { width: 980, height: 1740 },
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "standalone", { get: () => true });
    });
    await page.setContent(
      `<!doctype html><html lang="pt-BR"><head>
        <meta name="viewport" content="${VIEWPORT_CONTENT}">
        <script>${PHONE_VIEWPORT_GUARD}</script>
      </head><body><main data-feed>ok</main></body></html>`,
      { waitUntil: "domcontentloaded" },
    );
    const box = await page.evaluate(() => ({
      content: document.querySelector('meta[name="viewport"]')?.getAttribute("content") ?? "",
      shell: document.documentElement.getAttribute("data-shell"),
      screen: screen.width,
      inner: window.innerWidth,
    }));
    assert.equal(box.shell, "phone");
    assert.ok(box.screen > 0 && box.screen <= 430, `screen ${box.screen}`);
    assert.match(box.content, new RegExp(`width=${box.screen}`));
    assert.match(box.content, /shrink-to-fit=no/);
    assert.doesNotMatch(box.content, /user-scalable\s*=\s*no/i);
  } finally {
    await browser.close();
  }
});
