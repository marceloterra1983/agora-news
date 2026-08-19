import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { unavailable } from "./required-smoke.mjs";
import { groupMenuOpensUp } from "../src/lib/news/fonte-menu-place.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");
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

test("open card footer exposes the five actions and keeps them on screen", () => {
  const row = read("src/components/news/fontes-profile-row.tsx");
  const controls = read("src/components/news/fonte-controls.tsx");
  const css = `${read("src/lib/news/phone-layout.css")}\n${read("src/styles.css")}`;
  const tip = read("src/components/news/icon-btn.tsx");
  assert.match(row, /data-fonte-actions/);
  assert.match(row, /scrollIntoView/);
  assert.match(row, /data-fonte-action=["']x["']/);
  assert.match(controls, /data-fonte-action=["']star["']/);
  assert.match(controls, /data-fonte-action=["']notify["']/);
  assert.match(controls, /data-fonte-action=["']power["']/);
  assert.match(controls, /data-fonte-action=["']group["']/);
  assert.match(controls, /groupMenuOpensUp/);
  assert.match(css, /\[data-fonte-actions\]/);
  assert.match(css, /scroll-margin-bottom/);
  assert.doesNotMatch(tip, /title:\s*children\.props\.title \?\? label/);
});

test("group menu opens down when the header would clip it", () => {
  assert.equal(groupMenuOpensUp({ spaceAbove: 240, spaceBelow: 80 }), true);
  assert.equal(groupMenuOpensUp({ spaceAbove: 40, spaceBelow: 220 }), false);
  assert.equal(groupMenuOpensUp({ spaceAbove: 80, spaceBelow: 60 }), true);
});

test("notify persists locally when permission is granted even if push fails", async (t) => {
  const descriptors = new Map(
    ["window", "navigator", "Notification"].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  const previousFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = previousFetch;
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });

  const values = new Map();
  const localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      Notification: {},
      localStorage,
      dispatchEvent() {},
    },
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { serviceWorker: { ready: new Promise(() => {}) } },
  });
  Object.defineProperty(globalThis, "Notification", {
    configurable: true,
    value: {
      permission: "granted",
      requestPermission: async () => "granted",
    },
  });
  globalThis.fetch = async () => new Response("nope", { status: 503 });

  const { createServer } = await import("vite");
  const server = await createServer({
    configFile: false,
    logLevel: "silent",
    resolve: { alias: { "@": join(root, "src") } },
    server: { middlewareMode: true },
  });
  t.after(() => server.close());
  const notify = await server.ssrLoadModule(
    `/src/lib/news/notify-favorites.ts?profile-buttons=${Date.now()}`,
  );

  const started = Date.now();
  assert.equal(await notify.setFavoriteNotifyHandle("theo", true), "granted");
  assert.ok(Date.now() - started < 1500, "push hang must not block the bell");
  assert.equal(values.get("agora-notify-fav-v1"), "1");
  assert.match(String(values.get("agora-fontes-notify-v1")), /theo/);
});

test("Playwright: all five profile actions stay above the tab bar and respond", async (t) => {
  if (!(await live())) {
    unavailable(t, `smoke precisa de ${base} no ar`);
    return;
  }
  const { chromium } = await import("playwright");
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
  } catch (error) {
    if (/Executable doesn't exist/i.test(String(error))) {
      unavailable(t, "Playwright Chromium ausente — npx playwright install chromium");
      return;
    }
    throw error;
  }
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const res = await page.goto(`${base}/fontes?secao=ai`, {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });
    assert.ok(res && res.status() < 400, `GET /fontes ${res?.status()}`);
    const rows = page.locator('[data-testid="fonte-row"]');
    await rows.first().waitFor({ timeout: 15_000 });
    const n = await rows.count();
    const idx = Math.min(8, Math.max(0, n - 1));
    const row = rows.nth(idx);
    await row.locator("button[aria-expanded]").first().click();
    const actions = row.locator("[data-fonte-actions]");
    if (!(await actions.count())) {
      unavailable(
        t,
        "servidor vivo ainda não tem o rodapé novo do perfil — pm2 restart após o merge",
      );
      return;
    }
    await actions.waitFor({ timeout: 8_000 });

    const geometry = await page.evaluate(() => {
      const bar = document.querySelector("[data-fonte-actions]");
      const nav = document.querySelector("[data-chrome=tabs]");
      if (!bar || !nav) return null;
      const a = bar.getBoundingClientRect();
      const n = nav.getBoundingClientRect();
      return {
        actionsBottom: Math.round(a.bottom),
        navTop: Math.round(n.top),
      };
    });
    assert.ok(geometry, "rodapé do perfil ou tab bar ausente");
    assert.ok(
      geometry.actionsBottom <= geometry.navTop - 4,
      `botões sob a tab bar (${geometry.actionsBottom} > ${geometry.navTop})`,
    );

    const names = ["x", "star", "notify", "power", "group"];
    for (const name of names) {
      assert.equal(
        await row.locator(`[data-fonte-action="${name}"]`).count(),
        1,
        name,
      );
    }

    const star = row.locator('[data-fonte-action="star"]');
    const before = await star.getAttribute("aria-pressed");
    await star.click();
    assert.notEqual(await star.getAttribute("aria-pressed"), before);
    assert.equal(await row.locator("button[aria-expanded=true]").count(), 1);

    const power = row.locator('[data-fonte-action="power"]');
    const powerBefore = await power.getAttribute("aria-pressed");
    await power.click();
    assert.notEqual(await power.getAttribute("aria-pressed"), powerBefore);

    const href = await row.locator('[data-fonte-action="x"]').getAttribute("href");
    assert.match(String(href), /^https:\/\/x\.com\//);

    await row.locator('[data-fonte-action="group"]').click();
    const menu = row.getByRole("list", { name: "Grupo do perfil" });
    await menu.waitFor({ timeout: 4_000 });
    const menuBox = await menu.boundingBox();
    assert.ok(menuBox && menuBox.y >= 0);
    assert.ok(menuBox.y + menuBox.height <= 844);

    const notifyBtn = row.locator('[data-fonte-action="notify"]');
    await notifyBtn.click();
    await page.waitForTimeout(400);
    assert.notEqual(await notifyBtn.getAttribute("aria-busy"), "true");
  } finally {
    await browser.close();
  }
});
