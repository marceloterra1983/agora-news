import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createServer } from "vite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("downloadSupabase queries both openai casings when the catalog is lowercase", async (t) => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  t.after(() => {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY;
    else process.env.SUPABASE_PUBLISHABLE_KEY = previousKey;
  });
  process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test_only";

  const server = await createServer({
    configFile: false,
    logLevel: "silent",
    resolve: { alias: { "@": join(root, "src") } },
    server: { middlewareMode: true },
  });
  t.after(() => server.close());
  const supabase = await server.ssrLoadModule(
    `/src/lib/news/supabase.ts?case=${Date.now()}`,
  );

  let captured = "";
  globalThis.fetch = async (url) => {
    captured = String(url);
    return Response.json([]);
  };

  await supabase.downloadSupabase("ai", {
    accounts: ["openai"],
    before: "2026-08-22T00:00:00.000Z",
  });

  assert.match(captured, /OpenAI/);
  assert.match(captured, /openai/);
  assert.match(captured, /account=in\./);
});
