import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";

const ENV_KEYS = [
  "SUPABASE_SECRET_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
  "REDIS_REST_URL",
  "REDIS_REST_TOKEN",
];

test("runIngest exposes and distributes only confirmed writes", async (t) => {
  const previousEnv = Object.fromEntries(
    ENV_KEYS.map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, {
    SUPABASE_SECRET_KEY: "sb_secret_orchestration_test",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_orchestration_test",
    VAPID_PUBLIC_KEY: "public-test",
    VAPID_PRIVATE_KEY: "private-test",
  });
  for (const key of ENV_KEYS.slice(4)) delete process.env[key];
  t.after(() => {
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  const server = await createServer({
    configFile: false,
    logLevel: "silent",
    server: { middlewareMode: true },
    ssr: { noExternal: ["web-push"] },
    plugins: [
      {
        name: "orchestration-web-push-mock",
        enforce: "pre",
        resolveId(id) {
          return id === "web-push" ? "\0orchestration-web-push-mock" : null;
        },
        load(id) {
          if (id !== "\0orchestration-web-push-mock") return null;
          return `export default {
            setVapidDetails: (...args) => globalThis.__ORCHESTRATION_PUSH__.setVapidDetails(...args),
            sendNotification: (...args) => globalThis.__ORCHESTRATION_PUSH__.sendNotification(...args),
          }`;
        },
      },
    ],
  });
  t.after(() => server.close());

  const [profiles, cache] = await Promise.all([
    server.ssrLoadModule("/src/lib/news/profiles.ts"),
    server.ssrLoadModule("/src/lib/news/cache.ts"),
  ]);
  cache.resetCacheProbe();
  await cache.cacheDel(
    cache.CACHE_KEYS.lock,
    cache.CACHE_KEYS.scanCursor,
    cache.CACHE_KEYS.newest,
  );
  t.after(() =>
    cache.cacheDel(
      cache.CACHE_KEYS.lock,
      cache.CACHE_KEYS.scanCursor,
      cache.CACHE_KEYS.newest,
    ),
  );

  const now = new Date().toISOString();
  const xLastRows = profiles.allProfiles().map((profile, index) => {
    const handle = profile.handle.replace(/^@+/, "");
    const id = String(8_000_000 + index);
    return {
      post_id: `last_${handle.toLowerCase()}`,
      account: handle,
      posted_at: now,
      summary_pt: "Última notícia",
      content: "Última notícia",
      post_url: `https://x.com/${handle}/status/${id}`,
    };
  });
  const statusIds = new Map();
  let syntheticListWrites = 0;
  let failedRow = null;
  let mainWrites = 0;
  let pushSends = 0;
  let stealLease = false;
  let leaseStolen = false;
  let lookupFails = false;

  globalThis.__ORCHESTRATION_PUSH__ = {
    setVapidDetails() {},
    async sendNotification() {
      pushSends += 1;
    },
  };
  const previousFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = previousFetch;
    delete globalThis.__ORCHESTRATION_PUSH__;
  });

  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    const method = init.method || "GET";
    if (url.includes("api.fxtwitter.com/2/profile/")) {
      const handle = decodeURIComponent(url.split("/profile/")[1].split("/")[0]);
      if (!statusIds.has(handle)) statusIds.set(handle, String(9_000_000 + statusIds.size));
      const id = statusIds.get(handle);
      return Response.json({
        results: [
          {
            id,
            text: "O modelo de inteligência artificial melhora a notícia no Brasil.",
            url: `https://x.com/${handle}/status/${id}`,
            created_timestamp: Math.floor(Date.now() / 1000) - statusIds.size,
          },
        ],
      });
    }
    if (url.startsWith("https://api.fxtwitter.com/")) {
      return Response.json({ user: {} });
    }
    if (url.includes("/rest/v1/user_watches")) {
      if (stealLease && !leaseStolen) {
        leaseStolen = true;
        await cache.cacheDel(cache.CACHE_KEYS.lock);
        assert.equal(
          await cache.cacheSetNx(cache.CACHE_KEYS.lock, "replacement", 90),
          true,
        );
      }
      return Response.json([]);
    }
    if (url.includes("/rest/v1/x_profiles")) return Response.json([]);
    if (url.includes("/rest/v1/push_subscriptions")) {
      assert.ok(failedRow);
      return Response.json([
        {
          user_id: "user-failed-only",
          endpoint: "https://fcm.googleapis.com/fcm/send/failed-only",
          p256dh: "public-key",
          auth: "auth-key",
          handles: [failedRow.account.toLowerCase()],
        },
      ]);
    }
    if (!url.includes("/rest/v1/posts")) {
      throw new Error(`unexpected_request:${method}:${url}`);
    }
    if (method === "POST") {
      const rows = JSON.parse(String(init.body || "[]"));
      const first = rows[0] || {};
      if (/^\d+$/.test(first.post_id || "") && first.source === "x") {
        mainWrites += 1;
        if (mainWrites === 2) {
          [failedRow] = rows;
          return new Response(null, { status: 503 });
        }
        return new Response(null, { status: 201 });
      }
      if (
        first.category === "cache" &&
        String(first.summary_pt || "").startsWith("agora:v2:list:")
      ) {
        syntheticListWrites += 1;
      }
      return new Response(null, { status: 201 });
    }
    if (url.includes("post_id=in.")) {
      if (lookupFails) return new Response(null, { status: 503 });
      return Response.json([]);
    }
    if (url.includes("category=eq.x-last")) return Response.json(xLastRows);
    return Response.json([]);
  };

  const ingest = await server.ssrLoadModule(
    `/src/lib/news/ingest.ts?orchestration=${Date.now()}`,
  );
  const result = await ingest.runIngest({
    limitHandles: 26,
    withProfiles: false,
  });
  assert.equal(result.ok, false);
  assert.equal(mainWrites, 2);
  assert.equal(result.confirmedIds.length, 25);
  assert.deepEqual(result.failedIds, [failedRow.post_id]);
  assert.equal(syntheticListWrites, 0);
  assert.equal(pushSends, 0);

  await cache.cacheDel(
    cache.CACHE_KEYS.lock,
    cache.CACHE_KEYS.scanCursor,
    cache.CACHE_KEYS.newest,
  );
  stealLease = true;
  const writesBeforeLoss = mainWrites;
  await assert.rejects(
    () => ingest.runIngest({ limitHandles: 26, withProfiles: false }),
    /ingest_failed/,
  );
  assert.equal(mainWrites, writesBeforeLoss);
  assert.equal(await cache.cacheGet(cache.CACHE_KEYS.scanCursor), null);

  stealLease = false;
  lookupFails = true;
  await cache.cacheDel(
    cache.CACHE_KEYS.lock,
    cache.CACHE_KEYS.scanCursor,
    cache.CACHE_KEYS.newest,
  );
  await assert.rejects(
    () => ingest.runIngest({ limitHandles: 26, withProfiles: false }),
    /ingest_failed/,
  );
  assert.equal(mainWrites, writesBeforeLoss);
  assert.equal(pushSends, 0);
});
