import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { unavailable } from "./required-smoke.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const base = (process.env.NEWS_SMOKE_URL || "http://127.0.0.1:3080").replace(
  /\/$/,
  "",
);

async function live() {
  try {
    const response = await fetch(`${base}/api/health/live`, {
      signal: AbortSignal.timeout(2_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function launchChromium(t) {
  if (!(await live())) {
    unavailable(t, `smoke precisa de ${base} no ar`);
    return null;
  }
  const { chromium } = await import("playwright");
  try {
    return await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
  } catch (error) {
    if (/Executable doesn't exist/i.test(String(error))) {
      unavailable(
        t,
        "Playwright Chromium ausente — npx playwright install chromium",
      );
      return null;
    }
    throw error;
  }
}

function color(css, name) {
  const match = css.match(
    new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`, "i"),
  );
  assert.ok(match, `token --color-${name} ausente`);
  return match[1];
}

function contrast(foreground, background) {
  const luminance = (hex) => {
    const channels = hex
      .slice(1)
      .match(/../g)
      .map((part) => parseInt(part, 16) / 255)
      .map((value) =>
        value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
      );
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test("landmark heading select: the shared shell uses native semantics", () => {
  const rootRoute = read("src/routes/__root.tsx");
  const chrome = read("src/components/news/app-chrome.tsx");
  const controls = read("src/components/news/fonte-controls.tsx");
  const story = read("src/components/news/story-card.tsx");
  const menu = read("src/components/news/app-menu.tsx");
  const login = read("src/routes/login.tsx");

  assert.match(rootRoute, /href=["']#conteudo-principal["']/);
  assert.match(chrome, /<main\b[^>]*id=["']conteudo-principal["']/s);
  assert.match(chrome, /<select\b[^>]*(?:aria-label|id)=/s);
  assert.doesNotMatch(
    `${chrome}\n${controls}`,
    /role=["'](?:listbox|option)["']/,
  );
  assert.match(story, /<h2\b/);
  assert.doesNotMatch(story, /<h3\b/);
  assert.doesNotMatch(menu, /role=["']menu(?:item)?["']/);
  assert.doesNotMatch(menu, /aria-haspopup=["']menu["']/);
  assert.match(login, /<h1\b[^>]*>[\s\S]*?Entrar no Agora[\s\S]*?<\/h1>/);
  assert.match(
    controls,
    /<input\b(?=[^>]*aria-label=["']Nome do novo grupo["'])/s,
  );
});

test("unread pressed focus contrast confirm: equivalent state stays visible", () => {
  const story = read("src/components/news/story-card.tsx");
  const row = read("src/components/news/fontes-profile-row.tsx");
  const hit = read("src/components/news/x-hit-row.tsx");
  const settings = read("src/routes/configuracoes.tsx");
  const controls = read("src/components/news/fonte-controls.tsx");
  const styles = read("src/styles.css");

  assert.match(story, /Não lida/);
  assert.match(row, /aria-pressed=\{[^}]*picked[^}]*\}/);
  assert.match(row, /aria-expanded=\{[^}]*picking[^}]*open[^}]*\}/);
  assert.doesNotMatch(row, /opacity-55/);
  assert.doesNotMatch(hit, /opacity-60/);
  assert.match(styles, /:focus-visible\s*\{/);
  assert.ok(
    contrast(color(styles, "mute"), color(styles, "paper-2")) >= 4.5,
    "texto mute em paper-2 precisa de contraste WCAG AA",
  );
  assert.match(settings, /\bconfirm\(/);
  assert.match(controls, /\bconfirm\(/);
});

test("theme, forms and PWA announce state before effects", () => {
  const theme = read("src/lib/news/theme.ts");
  const pwa = read("src/lib/pwa.ts");
  const install = read("src/components/news/pwa-install.tsx");
  const search = read("src/routes/buscar.tsx");
  const fontes = read("src/routes/fontes.tsx");
  const controls = read("src/components/news/fonte-controls.tsx");

  assert.match(theme, /THEME_BOOT_SCRIPT[\s\S]*theme-color/);
  assert.match(theme, /THEME_BOOT_SCRIPT[\s\S]*#12100e[\s\S]*#f2eee4/);
  assert.match(pwa, /let initialized = false/);
  assert.match(pwa, /function initPwa[\s\S]*initialized/);
  assert.match(pwa, /subscribePwa[\s\S]*initPwa\(\)/);
  assert.match(install, /<p[^>]*role=["']status["'][^>]*aria-live=["']polite["']/);
  assert.match(search, /<Input[\s\S]*name=["']profile-search["']/);
  assert.match(fontes, /<input[\s\S]*name=["']fontes-filter["']/);
  assert.match(controls, /<input[\s\S]*name=["']new-group["']/);
});

test("error busy: search failures and global exceptions stay distinct and safe", () => {
  const search = read("src/routes/buscar.tsx");
  const server = read("src/lib/news/server-profile.ts");
  const globalError = read("src/lib/error-component.tsx");
  const feed = read("src/components/news/feed.tsx");
  const references = read("src/routes/referencias.tsx");
  const article = read("src/routes/materia.$id.tsx");

  assert.match(search, /searchError|searchState/);
  assert.match(search, /role=["']alert["']/);
  assert.match(search, /aria-busy/);
  assert.match(server, /x_search_unavailable|unavailable/);
  assert.match(server, /res\.status\s*===\s*404/);
  assert.match(server, /throw new Error\(["']profile_unavailable["']\)/);
  assert.doesNotMatch(server, /catch\s*\{\s*return\s*\{\s*found:\s*false/s);
  assert.doesNotMatch(globalError, /error\.message/);
  assert.match(globalError, /onClick=\{reset\}/);
  assert.match(globalError, /(?:to|href)=["']\/["']/);
  assert.match(
    feed,
    /if\s*\(!next\.meta\.live\)\s*throw new Error\(["']feed_unavailable["']\)/s,
  );
  assert.match(feed, /Feed ao vivo indisponível/);
  assert.match(references, /probe\.isError/);
  assert.match(references, /probeFailed/);
  assert.match(references, /role=["']alert["']/);
  assert.match(references, /probe\.refetch\(\)/);
  assert.match(article, /\bisError\b/);
  assert.match(article, /role=["']alert["']/);
  assert.match(article, /\brefetch\(\)/);
});

test("article distinguishes a missing row from an unavailable source", async (t) => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  let failed = true;

  t.after(() => {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY;
    else process.env.SUPABASE_PUBLISHABLE_KEY = previousKey;
  });

  process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test_only";
  globalThis.fetch = async () =>
    failed
      ? new Response("upstream unavailable", { status: 503 })
      : Response.json([]);

  const { createServer } = await import("vite");
  const server = await createServer({
    configFile: false,
    logLevel: "silent",
    resolve: { alias: { "@": join(root, "src") } },
    server: { middlewareMode: true },
  });
  t.after(() => server.close());

  const supabase = await server.ssrLoadModule(
    `/src/lib/news/supabase.ts?article=${Date.now()}`,
  );
  await assert.rejects(
    supabase.downloadPostById("unavailable"),
    /supabase_503/,
  );
  failed = false;
  assert.equal(await supabase.downloadPostById("missing"), null);
});

test("feed marks retained content unavailable when canonical refresh fails", async (t) => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  let unavailable = false;
  let requests = 0;

  t.after(() => {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY;
    else process.env.SUPABASE_PUBLISHABLE_KEY = previousKey;
  });

  process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test_only";
  globalThis.fetch = async () => {
    requests += 1;
    if (unavailable)
      return new Response("upstream unavailable", { status: 503 });
    return Response.json([
      {
        post_id: "truthful-feed-1",
        account: "openai",
        posted_at: "2026-08-17T00:00:00.000Z",
        posted_at_sp: null,
        content: "Original",
        translation_pt: "Conteúdo atual",
        summary_pt: "Resumo atual",
        post_url: "https://x.com/openai/status/truthful-feed-1",
        media_label: null,
        image_url: null,
        category: "ai",
        batch_name: "test",
      },
    ]);
  };

  const { createServer } = await import("vite");
  const server = await createServer({
    configFile: false,
    logLevel: "silent",
    resolve: { alias: { "@": join(root, "src") } },
    server: { middlewareMode: true },
  });
  t.after(() => server.close());

  const feed = await server.ssrLoadModule(
    `/src/lib/news/feed.ts?truthful=${Date.now()}`,
  );
  const supabase = await server.ssrLoadModule("/src/lib/news/supabase.ts");
  const fresh = await feed.loadFeed("ai");
  assert.equal(fresh.live, true);

  unavailable = true;
  supabase.invalidateSupabaseList();
  const retained = await feed.loadFeed("ai");
  assert.equal(retained.stories[0]?.id, fresh.stories[0]?.id);
  assert.equal(retained.live, false);

  const failedAt = requests;
  unavailable = false;
  const recovered = await feed.loadFeed("ai");
  assert.equal(recovered.live, true);
  assert.ok(requests > failedAt, "retry reutilizou o cache degradado");

  globalThis.fetch = async () => Response.json([]);
  supabase.invalidateSupabaseList();
  const empty = await feed.loadFeed("tech");
  assert.equal(empty.live, true);
  assert.deepEqual(empty.stories, []);
});

test("notification busy: failed capability never becomes a successful preference", async (t) => {
  const descriptors = new Map(
    ["window", "navigator", "Notification"].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  t.after(() => {
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
    value: { serviceWorker: {} },
  });
  Object.defineProperty(globalThis, "Notification", {
    configurable: true,
    value: {
      permission: "granted",
      requestPermission: async () => "granted",
    },
  });

  const { createServer } = await import("vite");
  const server = await createServer({
    configFile: false,
    logLevel: "silent",
    resolve: { alias: { "@": join(root, "src") } },
    server: { middlewareMode: true },
  });
  t.after(() => server.close());
  const notify = await server.ssrLoadModule(
    `/src/lib/news/notify-favorites.ts?accessibility=${Date.now()}`,
  );

  assert.equal(await notify.setFavoriteNotifyHandle("OpenAI", true), "error");
  assert.equal(values.get("agora-notify-fav-v1"), undefined);
  assert.equal(values.get("agora-fontes-notify-v1"), undefined);

  const page = read("src/routes/fontes.tsx");
  const hook = read("src/lib/news/use-notify-favorites.ts");
  assert.doesNotMatch(page, /enableFavoriteNotify/);
  assert.doesNotMatch(
    read("src/lib/news/use-fontes-prefs.ts"),
    /void subscribeWebPush/,
  );
  assert.match(`${page}\n${hook}`, /\bbusy\b/);
  assert.match(`${page}\n${hook}`, /\berror\b/);
});

test("notification disable commits only after remote and browser removal", async (t) => {
  const descriptors = new Map(
    ["window", "navigator"].map((key) => [
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

  const values = new Map([["agora-notify-fav-v1", "1"]]);
  const localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
  let deleteOk = false;
  let unsubscribeOk = false;
  let unsubscribeCalls = 0;
  const events = [];
  const subscription = {
    endpoint: "https://updates.push.services.mozilla.com/wpush/test",
    unsubscribe: async () => {
      unsubscribeCalls += 1;
      events.push("unsubscribe");
      return unsubscribeOk;
    },
  };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      PushManager: function PushManager() {},
      localStorage,
      dispatchEvent() {},
    },
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      serviceWorker: {
        ready: Promise.resolve({
          pushManager: { getSubscription: async () => subscription },
        }),
      },
    },
  });
  globalThis.fetch = async (_url, options) => {
    assert.equal(options?.method, "DELETE");
    events.push("delete");
    return new Response(deleteOk ? null : "unavailable", {
      status: deleteOk ? 204 : 503,
    });
  };

  const { createServer } = await import("vite");
  const server = await createServer({
    configFile: false,
    logLevel: "silent",
    resolve: { alias: { "@": join(root, "src") } },
    server: { middlewareMode: true },
  });
  t.after(() => server.close());
  const notify = await server.ssrLoadModule(
    `/src/lib/news/notify-favorites.ts?disable=${Date.now()}`,
  );

  assert.equal(await notify.disableFavoriteNotify(), "error");
  assert.equal(values.get("agora-notify-fav-v1"), "1");
  assert.equal(unsubscribeCalls, 0);

  deleteOk = true;
  assert.equal(await notify.disableFavoriteNotify(), "error");
  assert.equal(values.get("agora-notify-fav-v1"), "1");

  unsubscribeOk = true;
  events.length = 0;
  assert.equal(await notify.disableFavoriteNotify(), "off");
  assert.equal(values.get("agora-notify-fav-v1"), "0");
  assert.deepEqual(events, ["delete", "unsubscribe"]);
});

test("hydration URL theme: server defaults hydrate before browser state is applied", () => {
  const home = read("src/routes/index.tsx");
  const fontes = read("src/routes/fontes.tsx");
  const buscar = read("src/routes/buscar.tsx");
  const theme = read("src/lib/news/theme.ts");

  assert.match(home, /group\?:\s*string/);
  assert.match(fontes, /q\?:\s*string/);
  assert.match(fontes, /sort\?:\s*SortKey/);
  assert.match(buscar, /q\?:\s*string/);
  assert.doesNotMatch(fontes, /useState<SortKey>\(readStoredSort\)/);
  assert.match(theme, /matchMedia\(["']\(prefers-color-scheme: dark\)["']\)/);
  assert.match(theme, /addEventListener\(["']change["']/);
});

test("PWA media grouped empty live: product claims match rendered capability", () => {
  const manifest = JSON.parse(read("public/manifest.webmanifest"));
  const rootRoute = read("src/routes/__root.tsx");
  const saved = read("src/routes/salvos.tsx");
  const fontes = read("src/routes/fontes.tsx");
  const feed = read("src/components/news/feed.tsx");
  const storyMedia = read("src/components/news/story-media.tsx");
  const article = read("src/components/news/article-view.tsx");
  const assetBlock = storyMedia.slice(
    storyMedia.indexOf("export function StoryAssetBlock"),
  );

  assert.equal(Object.hasOwn(manifest, "orientation"), false);
  assert.doesNotMatch(rootRoute, /IA — NEWS|Google Drive/);
  assert.doesNotMatch(saved, /mesmo offline/i);
  assert.match(fontes, /(?:visible|grouped)\.length\s*===\s*0/);
  assert.match(`${fontes}\n${feed}`, /role=["']status["']/);
  assert.match(`${fontes}\n${feed}`, /aria-(?:live|busy)/);
  assert.match(
    feed,
    /<div\b(?=[^>]*role=["']status["'])[^>]*>\s*<p[^>]*>Nada neste recorte<\/p>/s,
  );
  assert.match(storyMedia, /fetchPriority/);
  assert.match(storyMedia, /aria-label/);
  assert.match(assetBlock, /priority/);
  assert.match(assetBlock, /loading=\{priority\s*\?\s*["']eager["']/);
  assert.match(assetBlock, /fetchPriority=\{priority\s*\?\s*["']high["']/);
  assert.match(article, /<StoryAssetBlock\b[^>]*priority=\{index\s*===\s*0\}/s);
  assert.match(feed, /priority=\{[^}]*===\s*0[^}]*\}/);

  for (const path of [
    "src/routes/index.tsx",
    "src/routes/fontes.tsx",
    "src/routes/buscar.tsx",
    "src/routes/salvos.tsx",
    "src/routes/configuracoes.tsx",
    "src/routes/instalar.tsx",
    "src/routes/referencias.tsx",
    "src/routes/login.tsx",
    "src/routes/materia.$id.tsx",
  ]) {
    assert.match(read(path), /\bhead:\s*/, `${path}: metadata própria ausente`);
  }

  for (const path of [
    "src/components/news/app-menu.tsx",
    "src/components/news/article-view.tsx",
    "src/components/news/fontes-profile-row.tsx",
    "src/components/news/quote-card.tsx",
    "src/components/news/story-card.tsx",
    "src/components/news/story-media.tsx",
    "src/components/news/x-hit-row.tsx",
    "src/components/news/x-profile-card.tsx",
    "src/routes/fontes.tsx",
  ]) {
    for (const tag of read(path).match(/<(?:img|video)\b[^>]*>/gs) ?? []) {
      assert.match(tag, /\bwidth=/, `${path}: mídia sem width`);
      assert.match(tag, /\bheight=/, `${path}: mídia sem height`);
    }
  }
});

test("Playwright landmark heading select: every core route has one usable shell", async (t) => {
  const browser = await launchChromium(t);
  if (!browser) return;
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    for (const path of [
      "/?secao=ai",
      "/fontes?secao=ai",
      "/buscar?secao=ai",
      "/salvos?secao=ai",
      "/configuracoes",
      "/instalar",
      "/referencias",
      "/login",
      "/materia/missing",
    ]) {
      const response = await page.goto(`${base}${path}`, {
        waitUntil: "networkidle",
        timeout: 25_000,
      });
      assert.ok(
        response && response.status() < 400,
        `${path}: ${response?.status()}`,
      );
      assert.equal(
        await page.locator("main#conteudo-principal").count(),
        1,
        path,
      );
      assert.equal(await page.locator("h1").count(), 1, path);
      assert.equal(
        await page.locator('a[href="#conteudo-principal"]').count(),
        1,
        path,
      );
      await page.evaluate(() => document.activeElement?.blur());
      await page.keyboard.press("Tab");
      assert.equal(
        await page.evaluate(() => document.activeElement?.getAttribute("href")),
        "#conteudo-principal",
        `${path}: skip link não é o primeiro foco`,
      );
      assert.ok(
        await page.locator('a[href="#conteudo-principal"]').boundingBox(),
        `${path}: skip invisível no foco`,
      );
      await page.keyboard.press("Enter");
      assert.equal(
        await page.evaluate(() => document.activeElement?.id),
        "conteudo-principal",
        path,
      );
    }

    await page.goto(`${base}/?secao=ai`, { waitUntil: "networkidle" });
    const subject = page.getByRole("combobox", { name: /assunto/i });
    assert.equal(await subject.count(), 1);
    await subject.selectOption("tech");
    await page.waitForURL((url) => url.searchParams.get("secao") === "tech");
    assert.equal(
      await page.locator('[role="listbox"], [role="option"]').count(),
      0,
    );
    assert.equal(await page.locator('nav a[aria-current="page"]').count(), 1);
  } finally {
    await browser.close();
  }
});

test("Playwright unread pressed confirm and search error expose truthful state", async (t) => {
  const browser = await launchChromium(t);
  if (!browser) return;
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    await context.addInitScript(() => {
      localStorage.setItem("agora-seen-baseline-v1", '["__old_story__"]');
    });
    const page = await context.newPage();
    await page.goto(`${base}/?secao=ai`, { waitUntil: "networkidle" });
    const unread = page.locator('[data-unread="1"]').first();
    await unread.waitFor({ timeout: 15_000 });
    const unreadText = unread.getByText("Não lida", { exact: true });
    assert.equal(await unreadText.count(), 1);
    assert.notEqual(await unreadText.getAttribute("aria-hidden"), "true");

    await page.goto(`${base}/fontes?secao=ai`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Mover em lote" }).click();
    const pick = page.locator('[data-testid="fonte-row"] > div button').first();
    assert.notEqual(await pick.getAttribute("aria-pressed"), null);
    assert.equal(await pick.getAttribute("aria-expanded"), null);

    let confirms = 0;
    page.on("dialog", async (dialog) => {
      confirms += 1;
      await dialog.dismiss();
    });
    await page.goto(`${base}/configuracoes`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Esquecer o que já li/ }).click();
    assert.equal(confirms, 1);

    await page.goto(`${base}/buscar?secao=ai`, { waitUntil: "networkidle" });
    await page.route("**/_serverFn/**", (route) => route.abort("failed"));
    await page.getByLabel("Buscar perfil novo").fill("perfil-inexistente");
    const alert = page
      .getByRole("alert")
      .filter({ hasText: /não foi possível|tente novamente|falhou/i });
    await alert.waitFor({ timeout: 15_000 });
    assert.equal(
      await page.getByText(/Nenhum perfil novo com esse nome/i).count(),
      0,
    );
  } finally {
    await browser.close();
  }
});

test("Playwright hydration URL theme media and grouped empty remain stable", async (t) => {
  const browser = await launchChromium(t);
  if (!browser) return;
  try {
    const context = await browser.newContext({
      colorScheme: "light",
      viewport: { width: 1280, height: 800 },
    });
    await context.addInitScript(() => {
      localStorage.setItem("agora-fontes-sort", "groups");
      localStorage.setItem("agora-theme", "system");
    });
    const page = await context.newPage();
    const hydration = [];
    page.on("console", (message) => {
      if (
        /hydration|did not match|server rendered html/i.test(message.text())
      ) {
        hydration.push(message.text());
      }
    });
    page.on("pageerror", (error) => {
      if (/hydration|did not match/i.test(String(error)))
        hydration.push(String(error));
    });

    await page.goto(`${base}/fontes?secao=ai`, { waitUntil: "networkidle" });
    await page.waitForURL((url) => url.searchParams.get("sort") === "groups");
    await page.getByLabel("Filtrar no catálogo").fill("__sem_resultado__");
    await page.waitForURL(
      (url) => url.searchParams.get("q") === "__sem_resultado__",
    );
    await page
      .getByRole("status")
      .filter({ hasText: /nenhum/i })
      .waitFor();
    await page.getByRole("button", { name: "Seguidores" }).click();
    await page.waitForURL(
      (url) => url.searchParams.get("sort") === "followers",
    );

    await page.goto(`${base}/buscar?secao=ai`, { waitUntil: "networkidle" });
    await page.getByLabel("Buscar perfil novo").fill("openai");
    await page.waitForURL((url) => url.searchParams.get("q") === "openai");

    await page.goto(`${base}/?secao=ai`, { waitUntil: "networkidle" });
    const groups = page.locator("[data-group-chip]");
    assert.ok((await groups.count()) > 1, "feed sem grupos compartilháveis");
    await groups.nth(1).click();
    await page.waitForURL((url) => Boolean(url.searchParams.get("group")));
    const dimensions = await page
      .locator("[data-feed] img, [data-feed] video")
      .evaluateAll((items) =>
        items.map((item) => ({
          width: Number(item.getAttribute("width")),
          height: Number(item.getAttribute("height")),
        })),
      );
    for (const { width, height } of dimensions) {
      assert.ok(width > 0, "mídia sem width");
      assert.ok(height > 0, "mídia sem height");
    }

    await page.goto(`${base}/configuracoes`, { waitUntil: "networkidle" });
    assert.equal(await page.locator("html.dark").count(), 0);
    await page.emulateMedia({ colorScheme: "dark" });
    await page.waitForFunction(() =>
      document.documentElement.classList.contains("dark"),
    );
    assert.deepEqual(hydration, []);
  } finally {
    await browser.close();
  }
});
