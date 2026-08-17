import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("public catalog is anonymous-only and owner watches are isolated", async (t) => {
  const previousFetch = globalThis.fetch;
  const previousSecret = process.env.SUPABASE_SECRET_KEY;
  const previousUrl = process.env.SUPABASE_URL;
  const calls = [];
  const watches = [
    {
      handle: "usera-source",
      name: "User A Source",
      avatar: null,
      summary: "A",
      followers: 1,
      section: "ai",
    },
    {
      handle: "userb-source",
      name: "User B Source",
      avatar: null,
      summary: "B",
      followers: 2,
      section: "ai",
    },
  ];

  globalThis.fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    const rows = url.includes("user_id=eq.user-a")
      ? [watches[0]]
      : url.includes("user_id=eq.user-b")
        ? [watches[1]]
        : watches;
    return Response.json(rows);
  };
  process.env.SUPABASE_SECRET_KEY = "sb_secret_test_only";
  process.env.SUPABASE_URL = "https://supabase.test";

  t.after(() => {
    globalThis.fetch = previousFetch;
    if (previousSecret === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = previousSecret;
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
  });

  const { createServer } = await import("vite");
  const server = await createServer({
    configFile: false,
    logLevel: "silent",
    resolve: { alias: { "@": join(root, "src") } },
    server: { middlewareMode: true },
  });
  t.after(() => server.close());

  const catalog = await server.ssrLoadModule(
    `/src/lib/news/server-catalog.ts?privacy=${Date.now()}`,
  );

  const anonymous = await catalog.serverCatalogFor("ai");
  assert.equal(anonymous.handles.includes("usera-source"), false);
  assert.equal(anonymous.handles.includes("userb-source"), false);

  const ownerA = await catalog.serverCatalogFor("ai", "user-a");
  assert.equal(ownerA.handles.includes("usera-source"), true);
  assert.equal(ownerA.handles.includes("userb-source"), false);
  assert.ok(
    calls.some((url) => url.includes("user_id=eq.user-a")),
    "owner catalog must query only the verified owner",
  );
});

test("retained feed snapshots are refiltered for the current owner", async (t) => {
  const previousFetch = globalThis.fetch;
  const previousSecret = process.env.SUPABASE_SECRET_KEY;
  const previousPublishable = process.env.SUPABASE_PUBLISHABLE_KEY;
  const previousUrl = process.env.SUPABASE_URL;
  let unavailable = false;

  process.env.SUPABASE_SECRET_KEY = "sb_secret_test_only";
  process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test_only";
  process.env.SUPABASE_URL = "https://supabase.test";
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("/user_watches")) {
      return Response.json(
        url.includes("user_id=eq.user-a")
          ? [
              {
                handle: "usera-source",
                name: "A",
                avatar: null,
                summary: "A",
                followers: 1,
                section: "ai",
              },
            ]
          : [
              {
                handle: "userb-source",
                name: "B",
                avatar: null,
                summary: "B",
                followers: 2,
                section: "ai",
              },
            ],
      );
    }
    if (unavailable) return new Response("unavailable", { status: 503 });
    return Response.json([
      {
        post_id: "owner-a-story",
        account: "usera-source",
        posted_at: "2026-08-17T00:00:00.000Z",
        posted_at_sp: null,
        content: "A",
        translation_pt: "A",
        summary_pt: "A",
        post_url: "https://x.com/usera-source/status/owner-a-story",
        media_label: null,
        image_url: null,
        category: "ai",
        batch_name: "test",
      },
    ]);
  };

  t.after(() => {
    globalThis.fetch = previousFetch;
    for (const [name, value] of [
      ["SUPABASE_SECRET_KEY", previousSecret],
      ["SUPABASE_PUBLISHABLE_KEY", previousPublishable],
      ["SUPABASE_URL", previousUrl],
    ]) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  const { createServer } = await import("vite");
  const server = await createServer({
    configFile: false,
    logLevel: "silent",
    resolve: { alias: { "@": join(root, "src") } },
    server: { middlewareMode: true },
  });
  t.after(() => server.close());

  const [catalog, feed, supabase] = await Promise.all([
    server.ssrLoadModule(`/src/lib/news/server-catalog.ts?retained=${Date.now()}`),
    server.ssrLoadModule(`/src/lib/news/feed.ts?retained=${Date.now()}`),
    server.ssrLoadModule(`/src/lib/news/supabase.ts?retained=${Date.now()}`),
  ]);
  const ownerA = await catalog.serverCatalogFor("ai", "user-a");
  const ownerB = await catalog.serverCatalogFor("ai", "user-b");
  const fresh = await feed.loadFeed("ai", ownerA);
  assert.deepEqual(fresh.stories.map((story) => story.source), ["usera-source"]);

  unavailable = true;
  supabase.invalidateSupabaseList();
  const retained = await feed.loadFeed("ai", ownerB);
  assert.equal(retained.live, false);
  assert.deepEqual(retained.stories, []);
});

test("feed route never publishes a personalized response to a shared cache", () => {
  const route = readFileSync(join(root, "src/routes/api/feed.ts"), "utf8");
  assert.match(route, /Cache-Control["']\s*:\s*["']private, no-store["']/);
  assert.match(route, /CDN-Cache-Control["']\s*:\s*["']no-store["']/);
  assert.doesNotMatch(route, /Cache-Control["']\s*:\s*["']public,/);
});
