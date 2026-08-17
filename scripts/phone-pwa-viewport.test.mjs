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

const ANDROID_DESKTOP_SITE_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

test("viewport contract keeps pinch-zoom and names an explicit phone width", () => {
  assert.match(VIEWPORT_CONTENT, /width=device-width/);
  assert.match(VIEWPORT_CONTENT, /initial-scale=1/);
  assert.match(VIEWPORT_CONTENT, /viewport-fit=cover/);
  assert.match(VIEWPORT_CONTENT, /shrink-to-fit=no/);
  assert.doesNotMatch(VIEWPORT_CONTENT, /user-scalable\s*=\s*no/i);
  assert.doesNotMatch(VIEWPORT_CONTENT, /maximum-scale\s*=\s*1(?:\.0+)?(?!\d)/i);
  assert.match(PHONE_VIEWPORT_GUARD, /shrink-to-fit=no/);
  assert.match(PHONE_VIEWPORT_GUARD, /screen\.width/);
  assert.match(PHONE_VIEWPORT_GUARD, /display-mode:\s*standalone/);
  assert.match(PHONE_VIEWPORT_GUARD, /Android/i);
  assert.match(PHONE_VIEWPORT_GUARD, /width="\s*\+\s*/);
  assert.doesNotMatch(PHONE_VIEWPORT_GUARD, /layout>cssW\+40/);
  assert.doesNotMatch(PHONE_VIEWPORT_GUARD, /user-scalable\s*=\s*no/i);
});

test("phone chrome does not use 100vw/100dvw that trigger shrink-to-fit", () => {
  const css = read("src/lib/news/phone-layout.css");
  assert.doesNotMatch(css, /100vw/);
  assert.doesNotMatch(css, /100dvw/);
  assert.match(css, /html\[data-shell="phone"\]/);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /display-mode:\s*standalone/);
});

test("Android PWA cache bust and SW update do not keep a stale phone scale", () => {
  const rootSrc = read("src/routes/__root.tsx");
  const pwa = read("src/lib/pwa.ts");
  const sw = read("public/sw.js");
  const limpar = read("public/limpar.html");
  assert.match(rootSrc, /agora-cache-bust-v1[9]|agora-cache-bust-v[2-9]\d/);
  assert.match(pwa, /updateViaCache:\s*["']none["']/);
  assert.match(sw, /skipWaiting/);
  assert.doesNotMatch(sw, /addEventListener\(\s*["']fetch["']/);
  assert.match(limpar, /serviceWorker/);
  assert.match(read("vite.config.ts"), /["']\/limpar["']/);
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

async function androidPhone(devices) {
  return (
    devices["Pixel 7"] ??
    devices["Pixel 5"] ??
    devices["Galaxy S24"] ??
    devices["Galaxy S8"]
  );
}

test("Android Chrome PWA pins width when innerWidth already equals screen.width", async (t) => {
  const { devices } = await import("playwright");
  const pixel = await androidPhone(devices);
  const browser = await launchChromium(t);
  if (!browser) return;
  try {
    const context = await browser.newContext({
      ...pixel,
      locale: "pt-BR",
    });
    const page = await context.newPage();
    await page.emulateMedia({ colorScheme: "light" });
    await page.addInitScript(() => {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: (query) => {
          const standalone = String(query).includes("display-mode: standalone");
          return {
            matches: standalone,
            media: query,
            addEventListener() {},
            removeEventListener() {},
            addListener() {},
            removeListener() {},
            dispatchEvent() {
              return false;
            },
          };
        },
      });
    });
    await page.setContent(
      `<!doctype html><html lang="pt-BR"><head>
        <meta name="viewport" content="${VIEWPORT_CONTENT}">
        <script>${PHONE_VIEWPORT_GUARD}</script>
      </head><body><main data-feed>ok</main></body></html>`,
      { waitUntil: "domcontentloaded" },
    );
    const box = await page.evaluate(() => ({
      content:
        document.querySelector('meta[name="viewport"]')?.getAttribute("content") ??
        "",
      shell: document.documentElement.getAttribute("data-shell"),
      screen: screen.width,
      inner: window.innerWidth,
      htmlWidth: document.documentElement.style.width,
      overflowX: document.documentElement.style.overflowX,
    }));
    assert.equal(box.shell, "phone");
    assert.ok(box.screen > 0 && box.screen <= 480, `screen ${box.screen}`);
    assert.equal(box.inner, box.screen);
    assert.match(box.content, new RegExp(`width=${box.screen}`));
    assert.match(box.content, /shrink-to-fit=no/);
    assert.doesNotMatch(box.content, /user-scalable\s*=\s*no/i);
    assert.doesNotMatch(box.content, /maximum-scale\s*=\s*1(?:\.0+)?(?!\d)/i);
    assert.equal(box.htmlWidth, "100%");
    assert.match(box.overflowX, /hidden|clip/);
  } finally {
    await browser.close();
  }
});

test("Android desktop-site PWA (no Mobile UA) still pins a phone CSS width", async (t) => {
  const { devices } = await import("playwright");
  const pixel = await androidPhone(devices);
  const browser = await launchChromium(t);
  if (!browser) return;
  try {
    const context = await browser.newContext({
      ...pixel,
      locale: "pt-BR",
      userAgent: ANDROID_DESKTOP_SITE_UA,
      viewport: { width: 980, height: 1740 },
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: (query) => {
          const q = String(query);
          const standalone = q.includes("display-mode: standalone");
          const coarse = q.includes("pointer: coarse");
          const noHover = q.includes("hover: none");
          return {
            matches: standalone || coarse || noHover,
            media: query,
            addEventListener() {},
            removeEventListener() {},
            addListener() {},
            removeListener() {},
            dispatchEvent() {
              return false;
            },
          };
        },
      });
    });
    await page.setContent(
      `<!doctype html><html lang="pt-BR"><head>
        <meta name="viewport" content="${VIEWPORT_CONTENT}">
        <script>${PHONE_VIEWPORT_GUARD}</script>
      </head><body><main data-feed>ok</main></body></html>`,
      { waitUntil: "domcontentloaded" },
    );
    const box = await page.evaluate(() => ({
      content:
        document.querySelector('meta[name="viewport"]')?.getAttribute("content") ??
        "",
      shell: document.documentElement.getAttribute("data-shell"),
      ua: navigator.userAgent,
      screen: screen.width,
    }));
    assert.equal(box.shell, "phone");
    assert.doesNotMatch(box.ua, /Mobile/i);
    assert.match(PHONE_VIEWPORT_GUARD, /cssW=360/);
    assert.match(box.content, new RegExp(`width=${box.screen <= 640 ? box.screen : 360}`));
    assert.match(box.content, /shrink-to-fit=no/);
    assert.doesNotMatch(box.content, /user-scalable\s*=\s*no/i);
    assert.doesNotMatch(box.content, /maximum-scale\s*=\s*1(?:\.0+)?(?!\d)/i);
  } finally {
    await browser.close();
  }
});

test("Android PWA 980px layout viewport is forced to the phone CSS width", async (t) => {
  const { devices } = await import("playwright");
  const pixel = await androidPhone(devices);
  const browser = await launchChromium(t);
  if (!browser) return;
  try {
    const context = await browser.newContext({
      ...pixel,
      locale: "pt-BR",
      viewport: { width: 980, height: 1740 },
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: (query) => {
          const standalone = String(query).includes("display-mode: standalone");
          return {
            matches: standalone,
            media: query,
            addEventListener() {},
            removeEventListener() {},
            addListener() {},
            removeListener() {},
            dispatchEvent() {
              return false;
            },
          };
        },
      });
    });
    await page.setContent(
      `<!doctype html><html lang="pt-BR"><head>
        <meta name="viewport" content="${VIEWPORT_CONTENT}">
        <script>${PHONE_VIEWPORT_GUARD}</script>
      </head><body><main data-feed>ok</main></body></html>`,
      { waitUntil: "domcontentloaded" },
    );
    const box = await page.evaluate(() => ({
      content:
        document.querySelector('meta[name="viewport"]')?.getAttribute("content") ??
        "",
      shell: document.documentElement.getAttribute("data-shell"),
      screen: screen.width,
    }));
    assert.equal(box.shell, "phone");
    assert.ok(box.screen > 0 && box.screen <= 480, `screen ${box.screen}`);
    assert.match(box.content, new RegExp(`width=${box.screen}`));
    assert.match(box.content, /shrink-to-fit=no/);
    assert.doesNotMatch(box.content, /user-scalable\s*=\s*no/i);
  } finally {
    await browser.close();
  }
});

const ANDROID_412 = {
  userAgent:
    "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
  viewport: { width: 412, height: 915 },
  deviceScaleFactor: 2.75,
  isMobile: true,
  hasTouch: true,
};

async function loadGuard(page, { standalone, scale }) {
  const boot = `(()=>{
    Object.defineProperty(navigator,"standalone",{configurable:true,get:function(){return ${standalone ? "true" : "false"};}});
    var real=window.matchMedia.bind(window);
    window.matchMedia=function(query){
      var q=String(query);
      if(/display-mode:\\s*(standalone|minimal-ui|fullscreen)/.test(q)){
        return {matches:${standalone ? "true" : "false"},media:query,addEventListener:function(){},removeEventListener:function(){},addListener:function(){},removeListener:function(){},dispatchEvent:function(){return false;}};
      }
      return real(query);
    };
    var fake={scale:${scale},width:412,height:915,offsetLeft:0,offsetTop:0,pageLeft:0,pageTop:0,addEventListener:function(){},removeEventListener:function(){}};
    Object.defineProperty(window,"visualViewport",{configurable:true,get:function(){return fake;}});
  })();`;
  await page.setContent(
    `<!doctype html><html lang="pt-BR"><head>
      <meta name="viewport" content="${VIEWPORT_CONTENT}">
      <script>${boot}</script>
      <script>${PHONE_VIEWPORT_GUARD}</script>
    </head><body><main data-feed>ok</main></body></html>`,
    { waitUntil: "domcontentloaded" },
  );
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));
  return page.evaluate(() => {
    const h = document.documentElement;
    return {
      content:
        document.querySelector('meta[name="viewport"]')?.getAttribute("content") ??
        "",
      shell: h.getAttribute("data-shell"),
      zoom: h.style.zoom || "",
      zoomVar: h.style.getPropertyValue("--agora-standalone-zoom"),
      inner: window.innerWidth,
      screen: screen.width,
      ua: navigator.userAgent,
      standalone: Boolean(
        window.matchMedia("(display-mode: standalone)").matches ||
          navigator.standalone,
      ),
      vvScale: window.visualViewport?.scale ?? null,
    };
  });
}

test("standalone CSS exposes a zoom hook; browser rem stays 16px", () => {
  const css = read("src/lib/news/phone-layout.css");
  assert.match(
    css,
    /@media \(display-mode:\s*standalone\).*--agora-standalone-zoom/s,
  );
  assert.doesNotMatch(css, /font-size:\s*22px\s*!important/);
  assert.doesNotMatch(PHONE_VIEWPORT_GUARD, /user-scalable\s*=\s*no/i);
  assert.doesNotMatch(PHONE_VIEWPORT_GUARD, /maximum-scale\s*=\s*1(?:\.0+)?(?!\d)/i);
  assert.match(VIEWPORT_CONTENT, /width=device-width/);
  assert.doesNotMatch(VIEWPORT_CONTENT, /minimum-scale/);
});

test("Android standalone with Chrome scale<1 restores via CSS zoom, not a global rem bump", async (t) => {
  const browser = await launchChromium(t);
  if (!browser) return;
  try {
    const context = await browser.newContext({
      ...ANDROID_412,
      locale: "pt-BR",
    });
    const page = await context.newPage();
    const box = await loadGuard(page, { standalone: true, scale: 0.42 });
    const zoom = parseFloat(box.zoom || box.zoomVar || "0");
    assert.equal(box.shell, "phone");
    assert.match(box.ua, /Android/i);
    assert.ok(box.inner <= 430, `inner ${box.inner}`);
    assert.match(box.content, /minimum-scale=1/);
    assert.match(box.content, /shrink-to-fit=no/);
    assert.doesNotMatch(box.content, /user-scalable\s*=\s*no/i);
    assert.doesNotMatch(box.content, /maximum-scale\s*=\s*1(?:\.0+)?(?!\d)/i);
    assert.ok(
      zoom >= 2.2 && zoom <= 2.6,
      `standalone must undo 0.42 scale, zoom=${box.zoom || box.zoomVar}`,
    );
  } finally {
    await browser.close();
  }
});

test("guard drops a second viewport meta injected after boot (HeadContent hydration)", async (t) => {
  const browser = await launchChromium(t);
  if (!browser) return;
  try {
    const context = await browser.newContext({
      ...ANDROID_412,
      locale: "pt-BR",
    });
    const page = await context.newPage();
    await page.setContent(
      `<!doctype html><html lang="pt-BR"><head>
        <meta name="viewport" content="${VIEWPORT_CONTENT}">
        <script>${PHONE_VIEWPORT_GUARD}</script>
      </head><body><main data-feed>ok</main></body></html>`,
      { waitUntil: "domcontentloaded" },
    );
    await page.evaluate(() => {
      const extra = document.createElement("meta");
      extra.setAttribute("name", "viewport");
      extra.setAttribute(
        "content",
        "width=device-width, initial-scale=1, viewport-fit=cover, shrink-to-fit=no",
      );
      document.head.appendChild(extra);
    });
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => r(null))),
    );
    const box = await page.evaluate(() => ({
      count: document.querySelectorAll('meta[name="viewport"]').length,
      content:
        document.querySelector('meta[name="viewport"]')?.getAttribute("content") ??
        "",
    }));
    assert.equal(box.count, 1, `viewport metas ${box.count}`);
    assert.match(box.content, /width=412/);
    assert.doesNotMatch(box.content, /user-scalable\s*=\s*no/i);
  } finally {
    await browser.close();
  }
});

test("Android Chrome tab (not standalone) stays on the current pin — no zoom, no minimum-scale", async (t) => {
  const browser = await launchChromium(t);
  if (!browser) return;
  try {
    const context = await browser.newContext({
      ...ANDROID_412,
      locale: "pt-BR",
    });
    const page = await context.newPage();
    const box = await loadGuard(page, { standalone: false, scale: 0.42 });
    const zoom = parseFloat(box.zoom || box.zoomVar || "1") || 1;
    assert.equal(box.shell, "phone");
    assert.match(box.content, new RegExp(`width=${box.screen}`));
    assert.doesNotMatch(box.content, /minimum-scale/);
    assert.ok(
      zoom <= 1.02,
      `browser tab must not get standalone zoom (${box.zoom || box.zoomVar})`,
    );
  } finally {
    await browser.close();
  }
});
