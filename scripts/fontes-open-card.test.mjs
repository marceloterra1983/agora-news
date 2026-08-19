import assert from "node:assert/strict";
import test from "node:test";
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

async function openCard(page, index) {
  const row = page.locator('[data-testid="fonte-row"]').nth(index);
  await row.locator("button[aria-expanded]").first().click();
  const actions = row.locator("[data-fonte-actions]");
  if (!(await actions.count())) return null;
  await actions.waitFor({ timeout: 8_000 });
  return row;
}

test("Playwright Fontes: star notify power persist and back stays on /fontes", async (t) => {
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
    await page.locator('[data-testid="fonte-row"]').first().waitFor({ timeout: 15_000 });
    const n = await page.locator('[data-testid="fonte-row"]').count();
    let row = null;
    for (let i = 0; i < Math.min(n, 16); i++) {
      row = await openCard(page, i);
      if (row) break;
    }
    assert.ok(row, "nenhum card aberto com data-fonte-actions");

    const handle = String(await row.locator('[data-fonte-action="x"]').getAttribute("href"))
      .replace(/^https:\/\/x\.com\//i, "")
      .split(/[/?#]/)[0]
      .toLowerCase();
    assert.ok(handle, "handle do perfil");

    const star = row.locator('[data-fonte-action="star"]');
    const starBefore = await star.getAttribute("aria-pressed");
    await star.click();
    assert.notEqual(await star.getAttribute("aria-pressed"), starBefore);
    assert.match(
      String(await page.evaluate(() => localStorage.getItem("agora-fontes-starred-v1"))),
      new RegExp(handle, "i"),
    );

    const power = row.locator('[data-fonte-action="power"]');
    const powerBefore = await power.getAttribute("aria-pressed");
    await power.click();
    assert.notEqual(await power.getAttribute("aria-pressed"), powerBefore);
    assert.match(
      String(await page.evaluate(() => localStorage.getItem("agora-fontes-disabled-v1"))),
      new RegExp(handle, "i"),
    );
    assert.ok(await row.getByText(/pausada/i).count());

    const notifyBtn = row.locator('[data-fonte-action="notify"]');
    await notifyBtn.click();
    await page.waitForTimeout(500);
    assert.notEqual(await notifyBtn.getAttribute("aria-busy"), "true");
    assert.match(
      String(await page.evaluate(() => localStorage.getItem("agora-fontes-notify-v1"))),
      new RegExp(handle, "i"),
    );
    assert.equal(await row.locator("button[aria-expanded=true]").count(), 1);

    let materia = row.locator('a[href^="/materia/"]');
    if (!(await materia.count())) {
      for (let i = 0; i < Math.min(n, 20); i++) {
        const candidate = await openCard(page, i);
        if (!candidate) continue;
        const link = candidate.locator('a[href^="/materia/"]');
        if (await link.count()) {
          row = candidate;
          materia = link;
          break;
        }
      }
    }
    if (!(await materia.count())) return;
    await materia.first().click();
    await page.waitForURL(/\/materia\//, { timeout: 15_000 });
    await page.getByRole("button", { name: /Voltar/i }).click();
    await page.waitForURL(/\/fontes/, { timeout: 15_000 });
    const path = new URL(page.url()).pathname;
    assert.equal(path, "/fontes");
    assert.ok(await page.locator("[data-fonte-actions]").count(), "card aberto após voltar");
  } finally {
    await browser.close();
  }
});
