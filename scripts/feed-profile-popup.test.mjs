import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { liveSmokeUrl, unavailable } from "./required-smoke.mjs";

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

test("reader face opens a dialog that reuses the Fontes profile card", () => {
  const card = read("src/components/news/story-card.tsx");
  const feed = read("src/components/news/feed.tsx");
  const popup = read("src/components/news/feed-profile-popup.tsx");
  const shared = read("src/components/news/fonte-profile-card.tsx");
  const row = read("src/components/news/fontes-profile-row.tsx");

  assert.match(card, /data-testid=["']feed-profile-face["']/);
  assert.match(card, /onOpenProfile/);
  assert.match(card, /Abrir perfil @/);
  assert.match(card, /aria-haspopup=["']dialog["']/);
  assert.match(card, /size-11|min-h-\[44px\]/);

  assert.match(feed, /FeedProfilePopup|feed-profile-popup/);
  assert.match(feed, /onOpenProfile/);

  assert.match(popup, /role=["']dialog["']/);
  assert.match(popup, /aria-modal=["']true["']/);
  assert.match(popup, /data-testid=["']feed-profile-popup["']/);
  assert.match(popup, /Fechar perfil/);
  assert.match(popup, /Escape/);
  assert.match(popup, /data-fonte-action=["']group["']/);
  assert.match(popup, /<FonteProfileCard/);
  assert.match(read("src/components/news/fonte-controls.tsx"), /stopImmediatePropagation/);

  assert.match(shared, /<FonteLastPosts/);
  assert.match(shared, /<FonteControls/);
  assert.match(shared, /<ProfileEr/);
  assert.match(shared, /displayBlurb/);
  assert.match(shared, /data-fonte-actions/);
  assert.match(shared, /data-fonte-action=["']x["']/);
  assert.ok(
    shared.indexOf("<XLogo") < shared.indexOf("<FonteControls"),
    "X sits left of the Fontes controls",
  );

  assert.match(row, /<FonteProfileCard/);
  assert.doesNotMatch(row, /<FonteLastPosts/);
  assert.doesNotMatch(row, /<FonteControls/);
});

test("Playwright feed: avatar opens the profile card and Escape closes it", async (t) => {
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
    const res = await page.goto(`${base}/?secao=ai`, {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });
    assert.ok(res && res.status() < 400, `GET / ${res?.status()}`);
    const face = page.locator('[data-testid="feed-profile-face"]').first();
    await face.waitFor({ timeout: 15_000 });
    await face.click();
    const dialog = page.locator('[data-testid="feed-profile-popup"]');
    await dialog.waitFor({ timeout: 8_000 });
    assert.equal(await dialog.getAttribute("role"), "dialog");
    assert.ok(await dialog.locator("[data-fonte-actions]").count(), "ações do perfil");
    assert.ok(
      await dialog.getByText(/últimos? posts?/i).count(),
      "lista de posts do card expandido",
    );
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden", timeout: 4_000 });
  } finally {
    await browser.close();
  }
});
