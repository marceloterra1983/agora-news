import assert from "node:assert/strict";
import test from "node:test";
import { PHONE_MEDIA, VIEWPORT_CONTENT } from "../src/lib/news/phone-shell.ts";

const base = (process.env.NEWS_SMOKE_URL || "http://127.0.0.1:3080").replace(/\/$/, "");

async function live() {
  try {
    const res = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(2_000) });
    return res.ok;
  } catch {
    return false;
  }
}

test("rendered SSR HTML from 3080 has one device-width viewport", async (t) => {
  if (!(await live())) {
    t.skip(`smoke precisa de ${base} no ar`);
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
  if (!html.includes("agora-cache-bust-v13")) {
    t.skip("3080 ainda serve HTML antigo — o rebuild publica o documento novo");
    return;
  }
  const metas = html.match(/<meta[^>]*name=["']viewport["'][^>]*>/gi) ?? [];
  assert.equal(metas.length, 1, `viewport tags: ${metas.join(" | ")}`);
  assert.match(metas[0] ?? "", /width=device-width/);
  assert.match(metas[0] ?? "", /initial-scale=1/);
  assert.match(html.slice(0, 400), /name="viewport"/);
  assert.match(cc, /no-store/i);
});

test("Playwright iPhone: viewport meta + innerWidth === clientWidth", async (t) => {
  if (!(await live())) {
    t.skip(`smoke precisa de ${base} no ar`);
    return;
  }
  const { chromium, devices } = await import("playwright");
  const iphone = devices["iPhone 14"] ?? devices["iPhone 13"];
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
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
    if (!html.includes("agora-cache-bust-v13")) {
      t.skip("3080 ainda serve HTML antigo — o rebuild publica o documento novo");
      return;
    }
    const content = await page.locator('meta[name="viewport"]').getAttribute("content");
    assert.equal(content, VIEWPORT_CONTENT);
    const box = await page.evaluate(() => ({
      inner: window.innerWidth,
      client: document.documentElement.clientWidth,
      shell: document.documentElement.getAttribute("data-shell"),
    }));
    assert.equal(box.inner, box.client);
    assert.ok(box.inner >= 360 && box.inner <= 430, `innerWidth ${box.inner}`);
    assert.equal(box.shell, "phone");
    const feed = page.locator("[data-feed]");
    await feed.waitFor({ timeout: 15_000 });
    const feedBox = await feed.boundingBox();
    assert.ok(feedBox, "feed box");
    assert.ok(
      feedBox.width >= box.inner - 40,
      `feed ${feedBox.width}px should fill ~${box.inner}px`,
    );
  } finally {
    await browser.close();
  }
});

test("phone media query contract is 640px", () => {
  assert.equal(PHONE_MEDIA, "(max-width: 640px)");
  assert.equal(VIEWPORT_CONTENT, "width=device-width, initial-scale=1, viewport-fit=cover");
});
