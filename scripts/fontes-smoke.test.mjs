import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { liveSmokeUrl, unavailable } from "./required-smoke.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

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

test("Fontes list and group faces have stable smoke hooks", () => {
  const page = readFileSync(join(root, "src/routes/fontes.tsx"), "utf8");
  const row = readFileSync(
    join(root, "src/components/news/fontes-profile-row.tsx"),
    "utf8",
  );
  assert.match(page, /data-testid=["']fontes-list["']/);
  assert.match(page, /data-testid=["']fontes-toolbar["']/);
  assert.match(row, /data-testid=["']fonte-row["']/);
  assert.doesNotMatch(page, /src=\{f\.avatar \?\? ""\}/);
});

test("Playwright opens /fontes and sees the catalog list", async (t) => {
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
      unavailable(
        t,
        "Playwright Chromium ausente — npx playwright install chromium",
      );
      return;
    }
    throw error;
  }
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    const res = await page.goto(`${base}/fontes`, {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });
    assert.ok(res && res.status() < 400, `GET /fontes status ${res?.status()}`);
    await page
      .locator('[data-testid="fontes-toolbar"]')
      .waitFor({ timeout: 15_000 });
    const rows = page.locator('[data-testid="fonte-row"]');
    await rows.first().waitFor({ timeout: 15_000 });
    const n = await rows.count();
    assert.ok(n >= 8, `esperava ≥8 fontes, veio ${n}`);
    assert.equal(await page.locator("h1").innerText(), "Fontes");
    assert.ok(
      await page.getByRole("combobox", { name: "Ordenar fontes" }).count(),
    );
    const first = rows.first();
    const expand = first.locator("button[aria-expanded]").first();
    const post = first.locator('[data-testid="fonte-last-post"]');
    if (await post.count()) {
      const href = await post.getAttribute("href");
      assert.ok(
        href && (href.startsWith("/materia/") || href.startsWith("http")),
        `last post href ${href}`,
      );
    }
    await expand.click();
    assert.equal(await expand.getAttribute("aria-expanded"), "true");
    assert.ok(await first.getByText(/Últimos? posts?/i).count());
  } finally {
    await browser.close();
  }
});
