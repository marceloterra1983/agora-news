import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function row(id, category) {
  return {
    post_id: id,
    account: "openai",
    posted_at: "2026-08-17T12:00:00.000Z",
    posted_at_sp: null,
    content: id,
    translation_pt: id,
    summary_pt: id,
    post_url: `https://x.com/openai/status/${id}`,
    media_label: null,
    image_url: null,
    category,
    batch_name: "test",
  };
}

test("Supabase SWR caches empty lists and invalidation owns in-flight writes", async (t) => {
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
    `/src/lib/news/supabase.ts?swr=${Date.now()}`,
  );

  let requests = 0;
  globalThis.fetch = async () => {
    requests += 1;
    return Response.json([]);
  };
  assert.deepEqual(await supabase.downloadSupabase("tech"), []);
  assert.deepEqual(await supabase.downloadSupabase("tech"), []);
  assert.equal(requests, 1, "valid empty list was not cached");

  let malformedRequests = 0;
  globalThis.fetch = async () => {
    malformedRequests += 1;
    return Response.json(malformedRequests === 1 ? {} : []);
  };
  await assert.rejects(
    supabase.downloadSupabase("brasil"),
    /supabase_list_invalid/,
  );
  assert.deepEqual(await supabase.downloadSupabase("brasil"), []);
  assert.equal(malformedRequests, 2, "malformed list was cached as empty");

  const pending = [];
  globalThis.fetch = () =>
    new Promise((resolve) => {
      requests += 1;
      pending.push(resolve);
    });
  const oldRead = supabase.downloadSupabase("ai");
  assert.equal(pending.length, 1);
  supabase.invalidateSupabaseList();
  const newRead = supabase.downloadSupabase("ai");
  assert.equal(pending.length, 2);

  pending[0](Response.json([row("snapshot-before-ingest", "ai")]));
  assert.equal((await oldRead)[0]?.id, "snapshot-before-ingest");
  const joinedRead = supabase.downloadSupabase("ai");
  assert.equal(pending.length, 2, "old job removed the current in-flight job");

  pending[1](Response.json([row("snapshot-after-ingest", "ai")]));
  assert.equal((await newRead)[0]?.id, "snapshot-after-ingest");
  assert.equal((await joinedRead)[0]?.id, "snapshot-after-ingest");
  assert.equal(
    (await supabase.downloadSupabase("ai"))[0]?.id,
    "snapshot-after-ingest",
  );
  assert.equal(requests, 3);
});
