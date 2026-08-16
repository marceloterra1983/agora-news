import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const phoneCss = readFileSync(join(root, "src/lib/news/phone-layout.css"), "utf8");

const DESKTOP_BASE = `
  [data-chrome="compact"] [data-h-scroll] button,
  [data-chrome="compact"] [aria-haspopup="listbox"] {
    height: 32px; font-size: 11px; border: 0;
  }
  [data-chrome="compact"] [aria-haspopup="menu"] {
    width: 32px; height: 32px; border: 0;
  }
  [data-story] h3, [data-story] h3 a { font-size: 20px; }
  [data-story] > p, [data-feed] > p { font-size: 13px; }
  [data-chrome="tabs"] a {
    display: flex; min-height: 40px; min-width: 40px;
  }
  [data-chrome="tabs"] svg { width: 16px; height: 16px; }
`;

const FIXTURE = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <style>${DESKTOP_BASE}</style>
  <style>${phoneCss}</style>
</head>
<body>
  <header data-chrome="compact">
    <div>
      <button type="button" aria-haspopup="listbox">IA</button>
      <div data-h-scroll>
        <button type="button">Todos</button>
        <button type="button">Empresas</button>
      </div>
      <button type="button" aria-haspopup="menu" aria-label="Menu">☰</button>
    </div>
  </header>
  <div data-feed>
    <p>Atualizado há 22 min</p>
    <article data-story>
      <p><span>@simonw</span><span data-group="devs">Devs</span><time>há 22 min</time></p>
      <h3><a href="/">Manchete de teste no feed</a></h3>
    </article>
  </div>
  <nav data-chrome="tabs">
    <a aria-label="Feed"><svg viewBox="0 0 24 24"></svg></a>
  </nav>
</body>
</html>`;

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
      t.skip("Playwright Chromium ausente — npx playwright install chromium");
      return null;
    }
    throw err;
  }
}

async function measure(page) {
  return page.evaluate(() => {
    const chip = document.querySelector("[data-h-scroll] button");
    const ia = document.querySelector("[aria-haspopup=listbox]");
    const menu = document.querySelector("[aria-haspopup=menu]");
    const nav = document.querySelector("[data-chrome=tabs] a");
    const icon = document.querySelector("[data-chrome=tabs] svg");
    const h3 = document.querySelector("[data-story] h3");
    const meta = document.querySelector("[data-story] > p");
    const updated = document.querySelector("[data-feed] > p");
    const px = (el, prop) => (el ? parseFloat(getComputedStyle(el)[prop]) : 0);
    const box = (el) => {
      if (!el) return { w: 0, h: 0 };
      const r = el.getBoundingClientRect();
      return { w: r.width, h: r.height };
    };
    return {
      chipH: box(chip).h,
      chipFs: px(chip, "fontSize"),
      iaH: box(ia).h,
      iaW: box(ia).w,
      menuH: box(menu).h,
      menuW: box(menu).w,
      navH: box(nav).h,
      navW: box(nav).w,
      iconH: box(icon).h,
      headline: px(h3, "fontSize"),
      meta: px(meta, "fontSize"),
      updated: px(updated, "fontSize"),
    };
  });
}

test("Playwright 390px: chip ≥44, nav ≥48, headline ≥22, meta ≥14", async (t) => {
  const browser = await launchChromium(t);
  if (!browser) return;
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.setContent(FIXTURE, { waitUntil: "domcontentloaded" });
    const s = await measure(page);
    assert.ok(s.chipH >= 44, `chip height ${s.chipH}`);
    assert.ok(s.chipFs >= 15, `chip label ${s.chipFs}`);
    assert.ok(s.iaH >= 44 && s.iaW >= 44, `IA ${s.iaW}x${s.iaH}`);
    assert.ok(s.menuH >= 44 && s.menuW >= 44, `menu ${s.menuW}x${s.menuH}`);
    assert.ok(s.navH >= 48 && s.navW >= 48, `nav ${s.navW}x${s.navH}`);
    assert.ok(s.iconH >= 22, `nav icon ${s.iconH}`);
    assert.ok(s.headline >= 22, `headline ${s.headline}`);
    assert.ok(s.meta >= 14, `meta ${s.meta}`);
    assert.ok(s.updated >= 14, `updated ${s.updated}`);
  } finally {
    await browser.close();
  }
});

test("Playwright 1280px: desktop densities stay put", async (t) => {
  const browser = await launchChromium(t);
  if (!browser) return;
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.setContent(FIXTURE, { waitUntil: "domcontentloaded" });
    const s = await measure(page);
    assert.ok(s.chipH < 40, `desktop chip should stay compact, got ${s.chipH}`);
    assert.ok(s.chipFs < 14, `desktop chip label ${s.chipFs}`);
    assert.ok(s.headline < 22, `desktop headline ${s.headline}`);
    assert.ok(s.meta < 14, `desktop meta ${s.meta}`);
    assert.ok(s.navH < 48, `desktop nav ${s.navH}`);
  } finally {
    await browser.close();
  }
});

test("Playwright 1280px + data-shell=phone still uses the phone scale", async (t) => {
  const browser = await launchChromium(t);
  if (!browser) return;
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.setContent(FIXTURE.replace("<html lang", '<html data-shell="phone" lang'), {
      waitUntil: "domcontentloaded",
    });
    const s = await measure(page);
    assert.ok(s.chipH >= 44, `shell chip ${s.chipH}`);
    assert.ok(s.headline >= 22, `shell headline ${s.headline}`);
    assert.ok(s.meta >= 14, `shell meta ${s.meta}`);
    assert.ok(s.navH >= 48, `shell nav ${s.navH}`);
  } finally {
    await browser.close();
  }
});
