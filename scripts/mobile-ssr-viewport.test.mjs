import assert from "node:assert/strict";
import test from "node:test";
import { PHONE_MEDIA, VIEWPORT_CONTENT } from "../src/lib/news/phone-shell.ts";
import { unavailable } from "./required-smoke.mjs";

const base = (process.env.NEWS_SMOKE_URL || "http://127.0.0.1:3080").replace(
  /\/$/,
  "",
);

async function live() {
  try {
    const res = await fetch(`${base}/api/health/live`, {
      signal: AbortSignal.timeout(2_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

test("rendered SSR HTML from 3080 has one device-width viewport", async (t) => {
  if (!(await live())) {
    unavailable(t, `smoke precisa de ${base} no ar`);
    return;
  }
  const res = await fetch(`${base}/?secao=ai`, {
    headers: {
      Accept: "text/html",
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 WhatsApp/2.24.20.78",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });
  assert.ok(res.ok, `GET / status ${res.status}`);
  const html = await res.text();
  const cc = `${res.headers.get("cache-control") ?? ""} ${res.headers.get("cdn-cache-control") ?? ""}`;
  if (!html.includes("agora-cache-bust-v1")) {
    unavailable(
      t,
      `${base} ainda serve HTML antigo — publique o documento novo`,
    );
    return;
  }
  const metas = html.match(/<meta[^>]*name=["']viewport["'][^>]*>/gi) ?? [];
  assert.equal(metas.length, 1, `viewport tags: ${metas.join(" | ")}`);
  assert.match(metas[0] ?? "", /width=device-width/);
  assert.match(metas[0] ?? "", /initial-scale=1/);
  assert.doesNotMatch(metas[0] ?? "", /user-scalable\s*=\s*no/i);
  assert.doesNotMatch(metas[0] ?? "", /maximum-scale\s*=\s*1(?:\.0+)?(?!\d)/i);
  const cssHref = html.match(
    /<link\b[^>]*rel="stylesheet"[^>]*href="([^"]*\/assets\/[^/"]+-[A-Za-z0-9_-]{6,}\.css)"/,
  )?.[1];
  assert.ok(cssHref, "CSS compartilhado ausente");
  const cssResponse = await fetch(new URL(cssHref, base), {
    signal: AbortSignal.timeout(5_000),
  });
  assert.ok(cssResponse.ok, `GET CSS status ${cssResponse.status}`);
  assert.match(await cssResponse.text(), /touch-action:\s*pan-y pinch-zoom/);
  assert.match(html.slice(0, 400), /name="viewport"/);
  assert.match(cc, /no-store/i);
});

test("Playwright iPhone: viewport meta + innerWidth === clientWidth", async (t) => {
  if (!(await live())) {
    unavailable(t, `smoke precisa de ${base} no ar`);
    return;
  }
  const { chromium, devices } = await import("playwright");
  const iphone = devices["iPhone 14"] ?? devices["iPhone 13"];
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
  } catch (error) {
    if (/Executable doesn't exist/i.test(String(error))) {
      unavailable(
        t,
        "Playwright Chromium ausente — npx playwright install chromium",
      );
      return;
    }
    throw error;
  }
  try {
    const context = await browser.newContext({
      ...iphone,
      locale: "pt-BR",
    });
    const page = await context.newPage();
    const res = await page.goto(`${base}/?secao=ai`, {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });
    assert.ok(res && res.status() < 400, `status ${res?.status()}`);
    const html = await page.content();
    if (!html.includes("agora-cache-bust-v1")) {
      unavailable(
        t,
        `${base} ainda serve HTML antigo — publique o documento novo`,
      );
      return;
    }
    const content = await page
      .locator('meta[name="viewport"]')
      .getAttribute("content");
    assert.equal(content, VIEWPORT_CONTENT);
    assert.doesNotMatch(content ?? "", /user-scalable\s*=\s*no/i);
    assert.doesNotMatch(content ?? "", /maximum-scale\s*=\s*1(?:\.0+)?(?!\d)/i);
    const box = await page.evaluate(() => ({
      inner: window.innerWidth,
      client: document.documentElement.clientWidth,
      shell: document.documentElement.getAttribute("data-shell"),
    }));
    assert.equal(box.inner, box.client);
    assert.ok(box.inner >= 360 && box.inner <= 430, `innerWidth ${box.inner}`);
    assert.equal(box.shell, "phone");
    const feed = page.locator("[data-feed]");
    await feed.waitFor({ state: "attached", timeout: 15_000 });
    const feedBox = await page.evaluate(() => {
      const el = document.querySelector("[data-feed]");
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { width: r.width, height: r.height };
    });
    assert.ok(feedBox && feedBox.width > 0, "feed box");
    assert.ok(
      feedBox.width >= box.inner - 48,
      `feed ${feedBox.width}px should fill ~${box.inner}px`,
    );
    const scale = await page.evaluate(() => {
      const chip = document.querySelector(
        "[data-chrome=compact] [data-h-scroll] button",
      );
      const nav = document.querySelector("[data-chrome=tabs] a");
      const h2 = document.querySelector("[data-story] h2");
      const meta = document.querySelector("[data-story] > p");
      const px = (el, prop) =>
        el ? parseFloat(getComputedStyle(el)[prop]) : 0;
      const boxOf = (el) =>
        el ? el.getBoundingClientRect() : { width: 0, height: 0 };
      return {
        chipH: boxOf(chip).height,
        navH: boxOf(nav).height,
        headline: px(h2, "fontSize"),
        meta: px(meta, "fontSize"),
      };
    });
    const compactChips =
      html.includes("[data-group-chip]") ||
      html.includes("[data-h-scroll] > button");
    if (scale.chipH && compactChips) {
      assert.ok(
        scale.chipH >= 31 && scale.chipH <= 34,
        `live chip ${scale.chipH}`,
      );
    }
    if (scale.navH) assert.ok(scale.navH >= 44, `live nav ${scale.navH}`);
    const readerScale = /html\[data-font="sm"\]\s*\{\s*font-size:\s*14px/.test(
      html,
    );
    if (readerScale && scale.headline) {
      assert.ok(
        scale.headline >= 19.5 && scale.headline <= 22.5,
        `live headline ${scale.headline}`,
      );
    }
    if (readerScale && scale.meta) {
      assert.ok(
        scale.meta >= 12.5 && scale.meta <= 14.5,
        `live meta ${scale.meta}`,
      );
    }
  } finally {
    await browser.close();
  }
});

test("phone media query contract is 640px", () => {
  assert.equal(PHONE_MEDIA, "(max-width: 640px)");
  assert.equal(
    VIEWPORT_CONTENT,
    "width=device-width, initial-scale=1, viewport-fit=cover",
  );
});
