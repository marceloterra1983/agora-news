import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { unavailable } from "./required-smoke.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

test("chrome pins top+bottom and reserves feed space with bar tokens", () => {
  const chrome = read("src/components/news/app-chrome.tsx");
  const css = read("src/lib/news/phone-layout.css");
  const styles = read("src/styles.css");

  assert.match(chrome, /data-chrome="compact"/);
  assert.match(chrome, /data-chrome="tabs"/);
  assert.match(chrome, /data-chrome-main/);
  assert.match(chrome, /sticky top-0|fixed top-0/);
  assert.match(chrome, /fixed inset-x-0 bottom-0/);
  assert.match(chrome, /--agora-header/);
  assert.match(chrome, /--agora-nav-tap|--agora-tap/);
  assert.match(chrome, /safe-area-inset-bottom/);
  assert.match(chrome, /safe-area-inset-top/);

  assert.match(styles, /--agora-header:/);
  assert.match(styles, /--agora-tap:/);
  assert.match(styles, /--agora-nav-tap:/);

  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /\[data-chrome="compact"\][\s\S]{0,280}position:\s*fixed/i);
  assert.match(css, /\[data-chrome="tabs"\][\s\S]{0,280}position:\s*fixed/i);
  assert.match(
    css,
    /html\[data-shell="phone"\] \[data-chrome="compact"\][\s\S]{0,220}position:\s*fixed/i,
  );
  assert.match(css, /\[data-chrome-main\][\s\S]{0,240}padding-top:/);
  assert.match(css, /--agora-nav-tap:\s*44px/);
  assert.match(css, /--agora-tap:\s*44px/);
  assert.match(css, /\[data-chrome="groups"\][\s\S]{0,220}bottom:/);
  assert.match(css, /\[data-group-dock\][\s\S]{0,120}flex-wrap:\s*wrap/);
  assert.match(chrome, /data-group-dock/);
  assert.match(chrome, /flex-wrap/);
  assert.match(chrome, /bottom-\[calc\(var\(--agora-nav-tap\)/);
  assert.match(chrome, /opacity-70/);
  const dock = chrome.slice(chrome.indexOf("function GroupDock"));
  assert.doesNotMatch(dock, /data-h-scroll/);
  assert.doesNotMatch(dock, /overflow-x-auto/);
});

test("phone chrome keeps IA/menu/nav at 44px; group chips are 32px pills", () => {
  const css = read("src/lib/news/phone-layout.css");
  const chrome = read("src/components/news/app-chrome.tsx");
  const styles = read("src/styles.css");

  assert.match(css, /\[data-h-scroll\] > button[\s\S]{0,160}height:\s*32px/);
  assert.match(css, /\[data-group-chip\][\s\S]{0,160}padding:\s*10px 12px/);
  assert.doesNotMatch(
    css,
    /\[data-h-scroll\][^\n]{0,40}button[\s\S]{0,160}height:\s*44px/,
  );
  assert.doesNotMatch(
    css,
    /\[data-h-scroll\] button[\s\S]{0,80}\[data-section-select\][\s\S]{0,160}padding-left:\s*16px/,
  );
  assert.match(
    css,
    /\[data-chrome="compact"\] \[data-section-select\][\s\S]{0,200}height:\s*44px/,
  );
  assert.match(
    css,
    /\[data-chrome="compact"\] \[aria-haspopup="menu"\][\s\S]{0,160}height:\s*44px/,
  );
  assert.match(css, /\[data-chrome="tabs"\] a[\s\S]{0,160}height:\s*44px/);
  assert.doesNotMatch(
    css,
    /\[data-chrome="tabs"\] a[\s\S]{0,160}height:\s*56px/,
  );
  assert.match(chrome, /h-\[var\(--agora-tap\)\]|h-\[44px\]/);
  assert.match(chrome, /data-group-chip/);
  assert.match(chrome, /data-chrome="groups"/);
  assert.match(chrome, /h-\[32px\]/);
  assert.match(styles, /\[data-h-scroll\][\s\S]{0,280}scrollbar-width:\s*none/);
  assert.match(
    styles,
    /\[data-h-scroll\]::-webkit-scrollbar[\s\S]{0,80}display:\s*none/,
  );
});

const phoneCss = read("src/lib/news/phone-layout.css");

const FIXTURE = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <style>
    :root { --agora-nav-tap: 44px; --agora-header: 64px; --agora-groups: 5.5rem; }
    [data-chrome="compact"] { position: sticky; top: 0; z-index: 30; }
    [data-chrome="tabs"] { position: relative; }
    [data-chrome="compact"] [data-h-scroll] button,
    [data-chrome="compact"] [data-section-select] { height: 32px; }
    [data-chrome="compact"] [aria-haspopup="menu"] { width: 32px; height: 32px; }
    [data-chrome="tabs"] a { display: flex; min-height: 40px; min-width: 40px; }
  </style>
  <style>${phoneCss}</style>
</head>
<body>
  <div data-chrome-root>
    <header data-chrome="compact">
      <div style="display:flex;align-items:center;height:64px;gap:6px">
        <select data-section-select aria-label="Assunto"><option>IA</option></select>
        <div data-h-scroll style="display:flex;min-width:0;flex:1">
          <button type="button">Todos</button>
        </div>
        <button type="button" aria-haspopup="menu" aria-label="Menu">☰</button>
      </div>
    </header>
    <div data-chrome-main>
      <div data-feed style="height: 2000px">feed</div>
    </div>
    <div data-chrome="groups">
      <div data-group-dock>
        <button type="button" data-group-chip>Todos</button>
        <button type="button" data-group-chip>Empresas</button>
        <button type="button" data-group-chip>Startups</button>
        <button type="button" data-group-chip>Gadgets</button>
        <button type="button" data-group-chip>Segurança</button>
        <button type="button" data-group-chip>Devs</button>
        <button type="button" data-group-chip>Imprensa</button>
      </div>
    </div>
    <nav data-chrome="tabs">
      <div>
        <a aria-label="Feed"><svg viewBox="0 0 24 24"></svg></a>
        <a aria-label="Fontes"><svg viewBox="0 0 24 24"></svg></a>
        <a aria-label="Buscar"><svg viewBox="0 0 24 24"></svg></a>
        <a aria-label="Salvos"><svg viewBox="0 0 24 24"></svg></a>
      </div>
    </nav>
  </div>
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
      unavailable(
        t,
        "Playwright Chromium ausente — npx playwright install chromium",
      );
      return null;
    }
    throw err;
  }
}

async function chromeBox(page) {
  return page.evaluate(() => {
    const header = document.querySelector("[data-chrome=compact]");
    const tabs = document.querySelector("[data-chrome=tabs]");
    const main = document.querySelector("[data-chrome-main]");
    const chip = document.querySelector("[data-group-chip], [data-h-scroll] button");
    const groups = document.querySelector("[data-chrome=groups]");
    const ia = document.querySelector("[data-section-select]");
    const menu = document.querySelector("[aria-haspopup=menu]");
    const nav = document.querySelector("[data-chrome=tabs] a");
    const box = (el) => {
      if (!el) return { t: 0, b: 0, h: 0, w: 0 };
      const r = el.getBoundingClientRect();
      return { t: r.top, b: r.bottom, h: r.height, w: r.width };
    };
    const cs = (el) => (el ? getComputedStyle(el).position : "");
    return {
      headerPos: cs(header),
      tabsPos: cs(tabs),
      header: box(header),
      tabs: box(tabs),
      mainPadTop: main ? parseFloat(getComputedStyle(main).paddingTop) : 0,
      mainPadBottom: main
        ? parseFloat(getComputedStyle(main).paddingBottom)
        : 0,
      chipH: box(chip).h,
      groups: box(groups),
      iaH: box(ia).h,
      menuH: box(menu).h,
      navH: box(nav).h,
      vh: window.innerHeight,
    };
  });
}

test("Playwright 390px: chrome is fixed and tap heights match 44px", async (t) => {
  const browser = await launchChromium(t);
  if (!browser) return;
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    await page.setContent(FIXTURE, { waitUntil: "domcontentloaded" });
    const before = await chromeBox(page);
    assert.equal(
      before.headerPos,
      "fixed",
      `header position ${before.headerPos}`,
    );
    assert.equal(before.tabsPos, "fixed", `tabs position ${before.tabsPos}`);
    assert.ok(before.header.t <= 1, `header top ${before.header.t}`);
    assert.ok(
      Math.abs(before.tabs.b - before.vh) <= 1,
      `tabs bottom ${before.tabs.b} vh ${before.vh}`,
    );
    assert.ok(before.chipH >= 31 && before.chipH <= 33, `chip ${before.chipH}`);
    assert.ok(before.iaH >= 44, `IA ${before.iaH}`);
    assert.ok(before.menuH >= 44, `menu ${before.menuH}`);
    assert.ok(before.navH >= 44, `nav ${before.navH}`);
    assert.ok(
      before.iaH - before.chipH >= 10,
      `chip/IA ${before.chipH}/${before.iaH}`,
    );
    assert.ok(
      Math.abs(before.iaH - before.menuH) <= 1,
      `IA/menu ${before.iaH}/${before.menuH}`,
    );
    assert.ok(
      before.mainPadTop >= before.header.h - 1,
      `pad-top ${before.mainPadTop} header ${before.header.h}`,
    );
    assert.ok(
      before.mainPadBottom >= before.tabs.h - 1,
      `pad-bottom ${before.mainPadBottom} tabs ${before.tabs.h}`,
    );
    assert.ok(before.groups.h > 0, `groups height ${before.groups.h}`);
    assert.ok(
      before.groups.b <= before.tabs.t + 2,
      `groups above tabs ${before.groups.b} ${before.tabs.t}`,
    );
    assert.ok(
      before.groups.h >= 64,
      `groups wrap to 2+ lines ${before.groups.h}`,
    );

    await page.evaluate(() => window.scrollTo(0, 600));
    const after = await chromeBox(page);
    assert.equal(after.headerPos, "fixed");
    assert.equal(after.tabsPos, "fixed");
    assert.ok(after.header.t <= 1, `header scrolled top ${after.header.t}`);
    assert.ok(
      Math.abs(after.tabs.b - after.vh) <= 1,
      `tabs scrolled bottom ${after.tabs.b}`,
    );
    assert.ok(after.groups.h > 0, `groups still visible ${after.groups.h}`);
    assert.ok(
      after.groups.b <= after.tabs.t + 2,
      `groups stay above tabs ${after.groups.b} ${after.tabs.t}`,
    );
  } finally {
    await browser.close();
  }
});

test("Playwright 1280px: group dock stays pinned above tabs", async (t) => {
  const browser = await launchChromium(t);
  if (!browser) return;
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
    });
    await page.setContent(FIXTURE, { waitUntil: "domcontentloaded" });
    const box = await chromeBox(page);
    assert.ok(box.groups.h > 0, `desktop groups height ${box.groups.h}`);
    assert.ok(box.groups.t > 0, `desktop groups top ${box.groups.t}`);
    assert.ok(
      box.groups.b <= box.tabs.t + 2,
      `desktop groups above tabs ${box.groups.b} ${box.tabs.t}`,
    );
    assert.ok(
      box.groups.b < box.vh,
      `desktop groups in viewport ${box.groups.b} vh ${box.vh}`,
    );
  } finally {
    await browser.close();
  }
});
