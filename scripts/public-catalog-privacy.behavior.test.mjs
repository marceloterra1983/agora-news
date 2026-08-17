import assert from "node:assert/strict";
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
