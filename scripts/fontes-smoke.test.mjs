import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const base = (process.env.NEWS_SMOKE_URL || "http://127.0.0.1:3080").replace(/\/$/, "");

async function live() {
  try {
    const res = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(2_000) });
    return res.ok;
  } catch {
    return false;
  }
}

test("Fontes list and group faces have stable smoke hooks", () => {
  const page = readFileSync(join(root, "src/routes/fontes.tsx"), "utf8");
  const row = readFileSync(join(root, "src/components/news/fontes-profile-row.tsx"), "utf8");
  assert.match(page, /data-testid=["']fontes-list["']/);
  assert.match(page, /data-testid=["']fontes-toolbar["']/);
  assert.match(row, /data-testid=["']fonte-row["']/);
  assert.doesNotMatch(page, /src=\{f\.avatar \?\? ""\}/);
});

test("Playwright opens /fontes and sees the catalog list", async (t) => {
  if (!(await live())) {
    t.skip(`smoke precisa de ${base} no ar`);
    return;
  }
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const res = await page.goto(`${base}/fontes`, { waitUntil: "domcontentloaded", timeout: 20_000 });
    assert.ok(res && res.status() < 400, `GET /fontes status ${res?.status()}`);
    await page.locator('[data-testid="fontes-toolbar"]').waitFor({ timeout: 15_000 });
    const rows = page.locator('[data-testid="fonte-row"]');
    await rows.first().waitFor({ timeout: 15_000 });
    const n = await rows.count();
    assert.ok(n >= 8, `esperava ≥8 fontes, veio ${n}`);
    assert.equal(await page.locator("h1").innerText(), "Fontes");
    assert.ok(await page.getByRole("button", { name: "Recente" }).count());
    const first = rows.first();
    const expand = first.locator("button[aria-expanded]").first();
    const post = first.locator('[data-testid="fonte-last-post"]');
    if (await post.count()) {
      const href = await post.getAttribute("href");
      assert.ok(href && (href.startsWith("/materia/") || href.startsWith("http")), `last post href ${href}`);
    }
    await expand.click();
    assert.equal(await expand.getAttribute("aria-expanded"), "true");
    assert.ok(await first.getByText("Último post").count());
  } finally {
    await browser.close();
  }
});
