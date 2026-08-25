import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { unavailable } from "./required-smoke.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const phoneCss = readFileSync(
  join(root, "src/lib/news/phone-layout.css"),
  "utf8",
);

const DESKTOP_BASE = `
  [data-chrome="compact"] [data-h-scroll] button,
  [data-chrome="compact"] [data-section-switch] {
    height: 32px; font-size: 11px; border: 0;
  }
  [data-chrome="compact"] [aria-haspopup="menu"] {
    width: 32px; height: 32px; border: 0;
  }
  [data-story] h2, [data-story] h2 a { font-size: 20px; }
  [data-story] > p, [data-feed] > p { font-size: 13px; }
  [data-chrome="tabs"] a {
    display: flex; min-height: 40px; min-width: 40px;
  }
  [data-chrome="tabs"] svg { width: 16px; height: 16px; }
`;

function fixture(font = "") {
  const attr = font ? ` data-font="${font}"` : "";
  return `<!doctype html>
<html lang="pt-BR"${attr}>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <style>${DESKTOP_BASE}</style>
  <style>${phoneCss}</style>
</head>
<body>
  <header data-chrome="compact">
    <div>
      <div data-section-switch>
        <button type="button" data-section-chip>IA</button>
        <button type="button" data-section-chip>Tech</button>
        <button type="button" data-section-chip>Brasil</button>
      </div>
      <div data-h-scroll>
        <button type="button" data-group-chip>Todos</button>
        <button type="button" data-group-chip>Instituições</button>
      </div>
      <button type="button" aria-haspopup="menu" aria-label="Menu">☰</button>
    </div>
  </header>
  <div data-feed>
    <p>Atualizado há 22 min</p>
    <article data-story>
      <p><span>@simonw</span><span data-group="devs">Devs</span><time>há 22 min</time></p>
      <h2><a href="/">Manchete de teste no feed</a></h2>
    </article>
  </div>
  <nav data-chrome="tabs">
    <a aria-label="Feed"><svg viewBox="0 0 24 24"></svg></a>
  </nav>
</body>
</html>`;
}

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

async function measure(page) {
  return page.evaluate(() => {
    const chip = document.querySelector("[data-h-scroll] button");
    const scroller = document.querySelector("[data-h-scroll]");
    const ia = document.querySelector("[data-section-switch]");
    const menu = document.querySelector("[aria-haspopup=menu]");
    const nav = document.querySelector("[data-chrome=tabs] a");
    const icon = document.querySelector("[data-chrome=tabs] svg");
    const h2 = document.querySelector("[data-story] h2");
    const meta = document.querySelector("[data-story] > p");
    const updated = document.querySelector("[data-feed] > p");
    const html = document.documentElement;
    const px = (el, prop) => (el ? parseFloat(getComputedStyle(el)[prop]) : 0);
    const box = (el) => {
      if (!el) return { w: 0, h: 0 };
      const r = el.getBoundingClientRect();
      return { w: r.width, h: r.height };
    };
    return {
      html: px(html, "fontSize"),
      font: html.getAttribute("data-font"),
      chipH: box(chip).h,
      chipW: box(chip).w,
      chipFs: px(chip, "fontSize"),
      chipPadL: chip ? parseFloat(getComputedStyle(chip).paddingLeft) : 0,
      chipPadR: chip ? parseFloat(getComputedStyle(chip).paddingRight) : 0,
      scrollBar: scroller ? getComputedStyle(scroller).scrollbarWidth : "",
      overflowX: scroller ? getComputedStyle(scroller).overflowX : "",
      overflowY: scroller ? getComputedStyle(scroller).overflowY : "",
      touchAction: scroller ? getComputedStyle(scroller).touchAction : "",
      longW: box(document.querySelector("[data-h-scroll] button:last-child")).w,
      iaFs: px(ia, "fontSize"),
      iaH: box(ia).h,
      iaW: box(ia).w,
      menuH: box(menu).h,
      menuW: box(menu).w,
      navH: box(nav).h,
      navW: box(nav).w,
      iconH: box(icon).h,
      headline: px(h2, "fontSize"),
      meta: px(meta, "fontSize"),
      updated: px(updated, "fontSize"),
    };
  });
}

test("Playwright 390px default: reader scale, not 22/28 floors", async (t) => {
  const browser = await launchChromium(t);
  if (!browser) return;
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    await page.setContent(fixture("md"), { waitUntil: "domcontentloaded" });
    const s = await measure(page);
    assert.ok(s.html >= 15.5 && s.html <= 17, `html ${s.html}`);
    assert.ok(
      s.headline >= 19.5 && s.headline <= 22.5,
      `headline ${s.headline}`,
    );
    assert.ok(s.meta >= 12.5 && s.meta <= 14.5, `meta ${s.meta}`);
    assert.ok(s.updated >= 12.5 && s.updated <= 14.5, `updated ${s.updated}`);
    assert.ok(
      s.html < 20,
      `default html must not be the old 22px floor (${s.html})`,
    );
    assert.ok(
      s.headline < 26,
      `default headline must not be the old 28px floor (${s.headline})`,
    );
    assert.ok(s.chipH >= 31 && s.chipH <= 33, `chip height ${s.chipH}`);
    assert.ok(
      s.iaH - s.chipH >= 10,
      `chip must be lighter than IA ${s.chipH}/${s.iaH}`,
    );
    assert.ok(s.chipFs >= 12 && s.chipFs <= 13.5, `chip label ${s.chipFs}`);
    assert.ok(s.chipPadL >= 10 && s.chipPadL <= 14, `chip padL ${s.chipPadL}`);
    assert.ok(s.chipPadR >= 10 && s.chipPadR <= 14, `chip padR ${s.chipPadR}`);
    assert.ok(
      s.longW < 160,
      `Instituições width ${s.longW} should stay compact`,
    );
    assert.ok(s.iaH >= 44 && s.iaW >= 44, `IA ${s.iaW}x${s.iaH}`);
    assert.ok(s.menuH >= 44 && s.menuW >= 44, `menu ${s.menuW}x${s.menuH}`);
    assert.ok(s.navH >= 44 && s.navW >= 44, `nav ${s.navW}x${s.navH}`);
    assert.equal(s.scrollBar, "none", `scrollbar-width ${s.scrollBar}`);
    assert.equal(s.overflowX, "auto", `overflow-x ${s.overflowX}`);
    assert.equal(s.overflowY, "hidden", `overflow-y ${s.overflowY}`);
    assert.match(s.touchAction, /pan-x/);
    assert.match(s.touchAction, /pinch-zoom/);
  } finally {
    await browser.close();
  }
});

test("Playwright 390px: Pequeno / Médio / Grande scale without reload", async (t) => {
  const browser = await launchChromium(t);
  if (!browser) return;
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    await page.setContent(fixture("md"), { waitUntil: "domcontentloaded" });
    const md = await measure(page);
    await page.evaluate(() => {
      document.documentElement.dataset.font = "sm";
    });
    const sm = await measure(page);
    await page.evaluate(() => {
      document.documentElement.dataset.font = "lg";
    });
    const lg = await measure(page);

    assert.ok(
      sm.html < md.html,
      `sm html ${sm.html} should be < md ${md.html}`,
    );
    assert.ok(
      lg.html > md.html,
      `lg html ${lg.html} should be > md ${md.html}`,
    );
    assert.ok(
      sm.headline < md.headline,
      `sm headline ${sm.headline} < md ${md.headline}`,
    );
    assert.ok(
      lg.headline > md.headline,
      `lg headline ${lg.headline} > md ${md.headline}`,
    );
    assert.ok(
      Math.abs(sm.html / md.html - 0.9) <= 0.05,
      `sm ratio ${sm.html / md.html}`,
    );
    assert.ok(
      Math.abs(lg.html / md.html - 1.25) <= 0.05,
      `lg ratio ${lg.html / md.html}`,
    );
    assert.ok(md.html >= 15.5 && md.html <= 17, `md html ${md.html}`);
    assert.ok(
      lg.headline < 32,
      `grande headline still in range ${lg.headline}`,
    );
  } finally {
    await browser.close();
  }
});

test("Playwright 1280px: desktop densities stay put", async (t) => {
  const browser = await launchChromium(t);
  if (!browser) return;
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
    });
    await page.setContent(fixture(), { waitUntil: "domcontentloaded" });
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

test("Playwright 1280px + data-shell=phone uses reader scale, not 22/28", async (t) => {
  const browser = await launchChromium(t);
  if (!browser) return;
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
    });
    await page.setContent(
      fixture("md").replace("<html lang", '<html data-shell="phone" lang'),
      {
        waitUntil: "domcontentloaded",
      },
    );
    const s = await measure(page);
    assert.ok(s.chipH >= 31 && s.chipH <= 33, `shell chip ${s.chipH}`);
    assert.ok(s.navH >= 44, `shell nav ${s.navH}`);
    assert.ok(s.html >= 15.5 && s.html <= 17, `shell html ${s.html}`);
    assert.ok(
      s.headline >= 19.5 && s.headline <= 22.5,
      `shell headline ${s.headline}`,
    );
    assert.ok(s.meta >= 12.5 && s.meta <= 14.5, `shell meta ${s.meta}`);
    assert.ok(s.headline < 26, `shell must not force 28px (${s.headline})`);
  } finally {
    await browser.close();
  }
});
