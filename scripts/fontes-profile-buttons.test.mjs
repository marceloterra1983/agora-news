import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { liveSmokeUrl, unavailable } from "./required-smoke.mjs";
import { groupMenuOpensUp } from "../src/lib/news/fonte-menu-place.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

async function live(base) {
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
  const card = read("src/components/news/fonte-profile-card.tsx");
  const controls = read("src/components/news/fonte-controls.tsx");
  const css = `${read("src/lib/news/phone-layout.css")}\n${read("src/styles.css")}`;
  assert.match(card, /data-fonte-actions/);
  assert.match(row, /scrollIntoView/);
  assert.match(card, /data-fonte-action=["']x["']/);
  assert.match(controls, /data-fonte-action=["']star["']/);
  assert.match(controls, /data-fonte-action=["']notify["']/);
  assert.match(controls, /data-fonte-action=["']power["']/);
  assert.match(controls, /data-fonte-action=["']group["']/);
  assert.match(controls, /groupMenuOpensUp/);
  assert.match(css, /\[data-fonte-actions\]/);
  assert.match(css, /scroll-margin-bottom/);
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

test("notify persists the handle when permission is denied", async (t) => {
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
    value: { Notification: {}, localStorage, dispatchEvent() {} },
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { serviceWorker: { ready: new Promise(() => {}) } },
  });
  Object.defineProperty(globalThis, "Notification", {
    configurable: true,
    value: {
      permission: "denied",
      requestPermission: async () => "denied",
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
    `/src/lib/news/notify-favorites.ts?denied=${Date.now()}`,
  );

  assert.equal(await notify.setFavoriteNotifyHandle("elonmusk", true), "granted");
  assert.match(String(values.get("agora-fontes-notify-v1")), /elonmusk/);
});

test("Playwright: all five profile actions stay above the tab bar and respond", async (t) => {
  const base = liveSmokeUrl(t);
  if (!base) return;
  if (!(await live(base))) {
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

    const href = await row.locator('[data-fonte-action="x"]').getAttribute("href");
    assert.match(String(href), /^https:\/\/x\.com\//);
    const handle = String(href)
      .replace(/^https:\/\/x\.com\//i, "")
      .split(/[/?#]/)[0]
      .toLowerCase();
    assert.ok(handle, "handle do perfil");

    async function storageHas(key) {
      const raw = String(
        await page.evaluate((k) => localStorage.getItem(k), key),
      );
      return new RegExp(handle, "i").test(raw);
    }

    const star = row.locator('[data-fonte-action="star"]');
    if ((await star.getAttribute("aria-pressed")) === "true") await star.click();
    await star.click();
    assert.equal(await star.getAttribute("aria-pressed"), "true");
    assert.equal(await storageHas("agora-fontes-starred-v1"), true);
    assert.equal(await row.locator("button[aria-expanded=true]").count(), 1);

    const power = row.locator('[data-fonte-action="power"]');
    if ((await power.getAttribute("aria-pressed")) !== "true") await power.click();
    await power.click();
    await page.waitForTimeout(1500);
    assert.equal(await power.getAttribute("aria-pressed"), "false");
    assert.equal(await storageHas("agora-fontes-disabled-v1"), true);
    assert.ok(await row.getByText(/pausada/i).count());

    await row.locator('[data-fonte-action="group"]').click();
    const menu = row.getByRole("list", { name: "Grupo do perfil" });
    await menu.waitFor({ timeout: 4_000 });
    const menuBox = await menu.boundingBox();
    assert.ok(menuBox && menuBox.y >= 0);
    assert.ok(menuBox.y + menuBox.height <= 844);
    await page.keyboard.press("Escape");

    const notifyBtn = row.locator('[data-fonte-action="notify"]');
    if ((await notifyBtn.getAttribute("aria-pressed")) === "true") {
      await notifyBtn.click();
      await page.waitForTimeout(400);
    }
    await notifyBtn.click();
    await page.waitForTimeout(400);
    assert.notEqual(await notifyBtn.getAttribute("aria-busy"), "true");
    assert.equal(await notifyBtn.getAttribute("aria-pressed"), "true");
    assert.equal(await storageHas("agora-fontes-notify-v1"), true);

    const materia = row.locator('a[href^="/materia/"]');
    if (await materia.count()) {
      await materia.first().click();
    } else {
      await page.evaluate(({ secao, open, y }) => {
        sessionStorage.setItem(
          "agora-feed-scroll-v1",
          JSON.stringify({ secao, y, path: "/fontes", open }),
        );
      }, { secao: "ai", open: handle, y: await page.evaluate(() => window.scrollY) });
      await page.goto(`${base}/materia/ci-fontes-back`, {
        waitUntil: "domcontentloaded",
        timeout: 15_000,
      });
    }
    await page.waitForURL(/\/materia\//, { timeout: 15_000 });
    await page.getByRole("button", { name: /Voltar/i }).click();
    await page.waitForURL(/\/fontes/, { timeout: 15_000 });
    assert.equal(new URL(page.url()).pathname, "/fontes");
    await page.locator("[data-fonte-actions]").first().waitFor({ timeout: 8_000 });
  } finally {
    await browser.close();
  }
});
