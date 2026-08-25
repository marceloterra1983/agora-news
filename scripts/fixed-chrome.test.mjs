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

  // Os chips de grupo moram no toolbar rolável do header — nenhum dock fixo
  // sobrepondo o feed, nenhum padding extra reservado para ele.
  assert.match(chrome, /function GroupChips/);
  assert.doesNotMatch(chrome, /data-chrome="groups"/);
  assert.doesNotMatch(chrome, /data-groups-dock/);
  assert.doesNotMatch(css, /\[data-chrome="groups"\]/);
  assert.doesNotMatch(css, /--agora-groups/);
  assert.match(chrome, /opacity-90/);
  assert.match(chrome, /opacity-100/);
  assert.doesNotMatch(chrome, /opacity-70/);
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
  assert.match(
    css,
    /\[data-chrome="compact"\] \[data-section-switch\][\s\S]{0,200}height:\s*44px/,
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
  assert.match(chrome, /data-section-switch/);
  assert.match(chrome, /data-section-chip/);
  assert.match(css, /\[data-section-switch\][\s\S]{0,280}height:\s*44px/);
  assert.match(chrome, /data-group-chip/);
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
    :root { --agora-nav-tap: 44px; --agora-header: 64px; }
    [data-chrome="compact"] { position: sticky; top: 0; z-index: 30; }
    [data-chrome="tabs"] { position: relative; }
    [data-chrome="compact"] [data-h-scroll] button { height: 32px; }
    [data-chrome="compact"] [data-section-switch] { height: 32px; }
    [data-chrome="compact"] [aria-haspopup="menu"] { width: 32px; height: 32px; }
    [data-chrome="tabs"] a { display: flex; min-height: 40px; min-width: 40px; }
  </style>
  <style>${phoneCss}</style>
</head>
<body>
  <div data-chrome-root>
    <header data-chrome="compact">
      <div style="display:flex;align-items:center;height:64px;gap:6px">
        <div data-section-switch role="group" aria-label="Assunto">
          <button type="button" data-section-chip>IA</button>
          <button type="button" data-section-chip>Tech</button>
          <button type="button" data-section-chip>Brasil</button>
        </div>
        <div data-h-scroll style="display:flex;min-width:0;flex:1;align-items:center;gap:6px">
          <button type="button" data-group-chip>Todos</button>
          <button type="button" data-group-chip>Empresas</button>
          <button type="button" data-group-chip>Startups</button>
          <button type="button" data-group-chip>Gadgets</button>
          <button type="button" data-group-chip>Segurança</button>
          <button type="button" data-group-chip>Devs</button>
          <button type="button" data-group-chip>Imprensa</button>
        </div>
        <button type="button" aria-haspopup="menu" aria-label="Menu">☰</button>
      </div>
    </header>
    <div data-chrome-main>
      <div data-feed style="height: 2000px">feed</div>
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
    const hs = document.querySelector("[data-h-scroll]");
    const chips = [...document.querySelectorAll("[data-group-chip]")];
    const ia = document.querySelector("[data-section-switch]");
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
      chipH: box(chips[0]).h,
      chipCount: chips.length,
      chipBoxes: chips.map(box),
      hsScrollable: hs ? hs.scrollWidth > hs.clientWidth : false,
      hsOverflowX: hs ? getComputedStyle(hs).overflowX : "",
      iaH: box(ia).h,
      menuH: box(menu).h,
      navH: box(nav).h,
      vh: window.innerHeight,
    };
  });
}

test("Playwright 390px: chrome is fixed, chips scroll inside the header", async (t) => {
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
    // Chips ficam DENTRO do header (nada flutua sobre o feed) e o excesso
    // rola horizontalmente em vez de embrulhar ou vazar.
    for (const chip of before.chipBoxes) {
      assert.ok(chip.t >= before.header.t - 1, `chip top ${chip.t}`);
      assert.ok(chip.b <= before.header.b + 1, `chip bottom ${chip.b}`);
    }
    assert.equal(before.hsOverflowX, "auto", `h-scroll ${before.hsOverflowX}`);
    assert.ok(before.hsScrollable, "7 chips a 390px devem rolar");

    await page.evaluate(() => window.scrollTo(0, 600));
    const after = await chromeBox(page);
    assert.equal(after.headerPos, "fixed");
    assert.equal(after.tabsPos, "fixed");
    assert.ok(after.header.t <= 1, `header scrolled top ${after.header.t}`);
    assert.ok(
      Math.abs(after.tabs.b - after.vh) <= 1,
      `tabs scrolled bottom ${after.tabs.b}`,
    );
    assert.ok(after.chipCount === 7, `chips ${after.chipCount}`);
  } finally {
    await browser.close();
  }
});

test("Playwright 1280px: chips stay in the header row on desktop", async (t) => {
  const browser = await launchChromium(t);
  if (!browser) return;
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
    });
    await page.setContent(FIXTURE, { waitUntil: "domcontentloaded" });
    const box = await chromeBox(page);
    assert.ok(box.chipCount === 7, `desktop chips ${box.chipCount}`);
    for (const chip of box.chipBoxes) {
      assert.ok(chip.t >= box.header.t - 1, `desktop chip top ${chip.t}`);
      assert.ok(chip.b <= box.header.b + 1, `desktop chip bottom ${chip.b}`);
    }
  } finally {
    await browser.close();
  }
});
