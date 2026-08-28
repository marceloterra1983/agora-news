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

test("reader text opens a dialog with the full article body", () => {
  const card = read("src/components/news/story-card.tsx");
  const feed = read("src/components/news/feed.tsx");
  const popup = read("src/components/news/feed-story-popup.tsx");
  const article = read("src/components/news/article-view.tsx");

  assert.match(card, /data-testid=["']feed-story-text["']/);
  assert.match(card, /onOpenStory/);
  assert.match(card, /Abrir mensagem:/);
  assert.match(card, /aria-haspopup=["']dialog["']/);

  assert.match(feed, /FeedStoryPopup|feed-story-popup/);
  assert.match(feed, /onOpenStory/);

  assert.match(popup, /role=["']dialog["']/);
  assert.match(popup, /aria-modal=["']true["']/);
  assert.match(popup, /data-testid=["']feed-story-popup["']/);
  assert.match(popup, /Fechar mensagem/);
  assert.match(popup, /Escape/);
  assert.match(popup, /<ArticleView/);
  assert.match(popup, /embedded/);

  assert.match(article, /embedded\?: boolean/);
  assert.match(article, /embedded \? null/);
  assert.match(article, /bodyText = story\.body \|\| story\.excerpt/);
  assert.match(article, /<PostText/);
});

test("Playwright feed: title opens the message dialog and Escape closes it", async (t) => {
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
      waitUntil: "networkidle",
      timeout: 20_000,
    });
    assert.ok(res && res.status() < 400, `GET / ${res?.status()}`);
    const text = page.locator('[data-testid="feed-story-text"]').first();
    await text.waitFor({ timeout: 15_000 });
    const cardTitle = String(await text.innerText());
    const dialog = page.locator('[data-testid="feed-story-popup"]');
    await text.click();
    if (!(await dialog.isVisible().catch(() => false))) {
      await page.waitForTimeout(400);
      await text.click();
    }
    await dialog.waitFor({ timeout: 12_000 });
    assert.equal(await dialog.getAttribute("role"), "dialog");
    assert.doesNotMatch(page.url(), /\/materia\//);
    assert.ok(await dialog.locator("[data-post]").count(), "corpo da mensagem");
    const dialogText = String(await dialog.innerText());
    assert.match(dialogText, /[A-Za-zÀ-ÿ]{8,}/);
    if (cardTitle.trim()) {
      const snippet = cardTitle.trim().slice(0, 24);
      assert.ok(
        dialogText.includes(snippet) || dialogText.length >= cardTitle.length,
        "popup mostra a mensagem, não um recorte vazio",
      );
    }
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden", timeout: 4_000 });
  } finally {
    await browser.close();
  }
});
