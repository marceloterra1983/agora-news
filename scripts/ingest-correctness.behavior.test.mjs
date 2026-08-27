import assert from "node:assert/strict";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { translateToPt } from "../src/lib/news/translate-pt.mjs";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

let server;
test.before(async () => {
  server = await createServer({
    configFile: false,
    logLevel: "silent",
    server: { middlewareMode: true },
    ssr: { noExternal: ["web-push"] },
    plugins: [
      {
        name: "ingest-web-push-mock",
        enforce: "pre",
        resolveId(id) {
          return id === "web-push" ? "\0ingest-web-push-mock" : null;
        },
        load(id) {
          if (id !== "\0ingest-web-push-mock") return null;
          return `export default {
            setVapidDetails: (...args) => globalThis.__INGEST_WEB_PUSH_MOCK__.setVapidDetails(...args),
            sendNotification: (...args) => globalThis.__INGEST_WEB_PUSH_MOCK__.sendNotification(...args),
          }`;
        },
      },
    ],
  });
});
test.after(async () => server?.close());

function setEnv(t, values) {
  const previous = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

function post(id) {
  return {
    post_id: String(id),
    account: "source",
    posted_at: "2026-08-16T12:00:00.000Z",
    content: "original",
    translation_pt: "traduzido",
    summary_pt: "resumo",
    post_url: `https://x.com/source/status/${id}`,
    media_label: "",
    image_url: "",
    category: "ai",
    batch_name: "test",
  };
}

test("upsert reports partial truth without exposing upstream bodies", async (t) => {
  setEnv(t, { SUPABASE_SECRET_KEY: "sb_secret_ingest_test" });
  const admin = await server.ssrLoadModule(
    `/src/lib/news/admin.ts?partial=${Date.now()}`,
  );
  const previousFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = previousFetch;
  });

  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return calls === 1
      ? new Response(null, { status: 201 })
      : new Response("TOP_SECRET_DATABASE_BODY", { status: 503 });
  };
  const rows = Array.from({ length: 26 }, (_, index) => post(index + 1));
  const result = await admin.upsertPosts(rows);
  assert.equal(result.ok, false);
  assert.equal(result.status, 503);
  assert.equal(result.count, 25);
  assert.deepEqual(
    result.confirmedIds,
    rows.slice(0, 25).map((row) => row.post_id),
  );
  assert.deepEqual(result.failedIds, ["26"]);
  assert.equal(result.error, "upsert_http_503");
  assert.doesNotMatch(JSON.stringify(result), /TOP_SECRET_DATABASE_BODY/);

  calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 2) throw new Error("PRIVATE_NETWORK_DETAIL");
    return new Response(null, { status: 201 });
  };
  const network = await admin.upsertPosts(rows);
  assert.equal(network.ok, false);
  assert.equal(network.status, 502);
  assert.deepEqual(network.confirmedIds, rows.slice(0, 25).map((row) => row.post_id));
  assert.deepEqual(network.failedIds, ["26"]);
  assert.equal(network.error, "upsert_request_failed");
  assert.doesNotMatch(JSON.stringify(network), /PRIVATE_NETWORK_DETAIL/);

  calls = 0;
  let checks = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(null, { status: 201 });
  };
  await assert.rejects(
    () =>
      admin.upsertPosts(rows, async () => {
        checks += 1;
        if (checks === 2) throw new Error("ingest_lock_lost");
      }),
    /ingest_lock_lost/,
  );
  assert.equal(calls, 1);
});

test("existing IDs and FX payloads fail closed at their trust boundaries", async (t) => {
  setEnv(t, { SUPABASE_PUBLISHABLE_KEY: "sb_publishable_ingest_test" });
  const ingestFetch = await server.ssrLoadModule(
    `/src/lib/news/ingest-fetch.ts?boundary=${Date.now()}`,
  );
  const previousFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = previousFetch;
  });

  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return calls === 1
      ? Response.json([{ post_id: "1" }])
      : new Response(null, { status: 503 });
  };
  const ids = Array.from({ length: 81 }, (_, index) => String(index + 1));
  await assert.rejects(() => ingestFetch.existingIds(ids), /existing_ids_http_503/);

  globalThis.fetch = async () =>
    new Response("not-json-private-body", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  await assert.rejects(
    () => ingestFetch.existingIds(["1"]),
    /existing_ids_invalid_json/,
  );

  for (const payload of [{}, [null], [{ post_id: 3 }]]) {
    globalThis.fetch = async () => Response.json(payload);
    await assert.rejects(
      () => ingestFetch.existingIds(["1"]),
      /existing_ids_invalid_payload/,
    );
  }

  globalThis.fetch = async () => new Response(null, { status: 502 });
  await assert.rejects(
    () => ingestFetch.statusesFor("OpenAI"),
    /fxtwitter_http_502/,
  );
  globalThis.fetch = async () => Response.json({ results: [{ id: "1", text: 7 }] });
  await assert.rejects(
    () => ingestFetch.statusesFor("OpenAI"),
    /fxtwitter_invalid_payload/,
  );
  globalThis.fetch = async () =>
    Response.json({
      results: [
        {
          id: "1",
          text: "valid",
          created_timestamp: 1_700_000_000,
          media: {
            videos: [
              { url: "https://video.twimg.com/test.mp4", thumbnail_url: null },
            ],
          },
          author: { description: null, avatar_url: null, followers: 1 },
        },
      ],
    });
  assert.equal((await ingestFetch.statusesFor("OpenAI")).length, 1);

  globalThis.fetch = async () =>
    Response.json({
      results: [
        {
          id: "2",
          text: "valid fallback",
          created_timestamp: 1e300,
          created_at: "2026-08-16T12:00:00.000Z",
        },
      ],
    });
  const [fallback] = await ingestFetch.statusesFor("OpenAI");
  assert.equal(ingestFetch.postedIso(fallback), "2026-08-16T12:00:00.000Z");

  globalThis.fetch = async () =>
    Response.json({
      results: [{ id: "3", text: "invalid date", created_timestamp: 1e300 }],
    });
  await assert.rejects(
    () => ingestFetch.statusesFor("OpenAI"),
    /fxtwitter_invalid_payload/,
  );
});

test("cache lease renew and release remain token-owned", async (t) => {
  setEnv(t, {
    UPSTASH_REDIS_REST_URL: undefined,
    UPSTASH_REDIS_REST_TOKEN: undefined,
    KV_REST_API_URL: undefined,
    KV_REST_API_TOKEN: undefined,
    REDIS_REST_URL: undefined,
    REDIS_REST_TOKEN: undefined,
  });
  const cache = await server.ssrLoadModule(
    `/src/lib/news/cache.ts?lease-memory=${Date.now()}`,
  );
  const realNow = Date.now;
  let now = 1_000;
  Date.now = () => now;
  t.after(() => {
    Date.now = realNow;
  });
  const key = "test:lease:owner";
  await cache.cacheDel(key);

  assert.equal(await cache.cacheSetNx(key, "owner-a", 1), true);
  now = 1_900;
  assert.equal(await cache.renewCacheLease(key, "owner-a", 1), true);
  now = 2_100;
  assert.equal(await cache.cacheSetNx(key, "owner-b", 1), false);
  now = 2_901;
  assert.equal(await cache.cacheSetNx(key, "owner-b", 1), true);
  assert.equal(await cache.releaseCacheLease(key, "owner-a"), false);
  assert.equal(await cache.cacheSetNx(key, "owner-c", 1), false);
  assert.equal(await cache.releaseCacheLease(key, "owner-b"), true);
  assert.equal(await cache.cacheSetNx(key, "owner-c", 1), true);
});

test("lease assertion detects an immediately replaced token", async (t) => {
  setEnv(t, {
    UPSTASH_REDIS_REST_URL: undefined,
    UPSTASH_REDIS_REST_TOKEN: undefined,
    KV_REST_API_URL: undefined,
    KV_REST_API_TOKEN: undefined,
    REDIS_REST_URL: undefined,
    REDIS_REST_TOKEN: undefined,
  });
  const cache = await server.ssrLoadModule("/src/lib/news/cache.ts");
  const ingestLease = await server.ssrLoadModule(
    "/src/lib/news/ingest-lease.ts",
  );
  cache.resetCacheProbe();
  await cache.cacheDel(cache.CACHE_KEYS.lock);
  const lease = await ingestLease.acquireIngestLease();
  assert.ok(lease);
  t.after(async () => {
    await lease.release();
    await cache.cacheDel(cache.CACHE_KEYS.lock);
  });

  await cache.cacheDel(cache.CACHE_KEYS.lock);
  assert.equal(
    await cache.cacheSetNx(cache.CACHE_KEYS.lock, "replacement", 90),
    true,
  );
  await assert.rejects(() => lease.assertOwned(), /ingest_lock_lost/);
  await lease.release();
  assert.equal(
    await cache.cacheSetNx(cache.CACHE_KEYS.lock, "next-owner", 90),
    false,
  );
});

test("Redis lock failures reject while genuine contention returns false", async (t) => {
  setEnv(t, {
    UPSTASH_REDIS_REST_URL: undefined,
    UPSTASH_REDIS_REST_TOKEN: undefined,
    KV_REST_API_URL: undefined,
    KV_REST_API_TOKEN: undefined,
    REDIS_REST_URL: undefined,
    REDIS_REST_TOKEN: undefined,
  });
  const previousFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = previousFetch;
  });
  const cache = await server.ssrLoadModule(
    `/src/lib/news/cache.ts?lease-redis=${Date.now()}`,
  );

  process.env.REDIS_REST_URL = "https://redis.invalid.test";
  cache.resetCacheProbe();
  await assert.rejects(
    () => cache.cacheSetNx("test:lease:url-only", "owner-a", 30),
    /redis_lease_unavailable/,
  );

  delete process.env.REDIS_REST_URL;
  process.env.REDIS_REST_TOKEN = "test-token";
  cache.resetCacheProbe();
  await assert.rejects(
    () => cache.cacheSetNx("test:lease:token-only", "owner-a", 30),
    /redis_lease_unavailable/,
  );

  process.env.UPSTASH_REDIS_REST_URL = "https://redis.invalid.test";
  cache.resetCacheProbe();
  await assert.rejects(
    () => cache.cacheSetNx("test:lease:cross-alias", "owner-a", 30),
    /redis_lease_unavailable/,
  );

  delete process.env.UPSTASH_REDIS_REST_URL;
  process.env.REDIS_REST_URL = "https://redis.invalid.test";
  globalThis.fetch = async (input) =>
    String(input).endsWith("/ping")
      ? new Response(null, { status: 204 })
      : Response.json({ result: null });
  cache.resetCacheProbe();
  assert.equal(
    await cache.cacheSetNx("test:lease:occupied", "owner-a", 30),
    false,
  );

  globalThis.fetch = async () => new Response(null, { status: 503 });
  cache.resetCacheProbe();
  await assert.rejects(
    () => cache.cacheSetNx("test:lease:down", "owner-a", 30),
    /redis_lease_unavailable/,
  );
});

test("malformed successful GTX payload reports the fallback", async (t) => {
  const previousFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = previousFetch;
  });
  globalThis.fetch = async () => Response.json({});
  let failures = 0;
  const original = "The model ships a useful reliability improvement today.";
  assert.equal(
    await translateToPt(original, {
      onFail: () => {
        failures += 1;
      },
    }),
    "",
  );
  assert.equal(failures, 1);
});

function pushRows(statuses = []) {
  return statuses.map((status) => ({
    user_id: `user-${status}`,
    endpoint: `https://fcm.googleapis.com/fcm/send/device-${status}`,
    p256dh: "public-key",
    auth: "auth-key",
    handles: ["favorite"],
  }));
}

test("push filters each owner's favorites before the top-three limit", async (t) => {
  setEnv(t, {
    SUPABASE_SECRET_KEY: "sb_secret_push_test",
    VAPID_PUBLIC_KEY: "public-test",
    VAPID_PRIVATE_KEY: "private-test",
  });
  const payloads = [];
  globalThis.__INGEST_WEB_PUSH_MOCK__ = {
    setVapidDetails() {},
    async sendNotification(_subscription, payload) {
      payloads.push(JSON.parse(payload));
    },
  };
  t.after(() => {
    delete globalThis.__INGEST_WEB_PUSH_MOCK__;
  });
  const previousFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = previousFetch;
  });
  globalThis.fetch = async () => Response.json(pushRows([200]));
  const push = await server.ssrLoadModule(
    `/src/lib/news/push-server.ts?favorite=${Date.now()}`,
  );
  const sent = await push.sendPushForStories([
    { id: "1", source: "other-a", title: "one" },
    { id: "2", source: "other-b", title: "two" },
    { id: "3", source: "other-c", title: "three" },
    { id: "4", source: "favorite", title: "four" },
  ]);
  assert.equal(sent, 1);
  assert.equal(payloads[0].url, "/materia/4");
});

test("push prunes only owner-scoped permanent subscription failures", async (t) => {
  setEnv(t, {
    SUPABASE_SECRET_KEY: "sb_secret_push_test",
    VAPID_PUBLIC_KEY: "public-test",
    VAPID_PRIVATE_KEY: "private-test",
  });
  const rows = pushRows([401, 403, 404, 410]);
  globalThis.__INGEST_WEB_PUSH_MOCK__ = {
    setVapidDetails() {},
    async sendNotification(subscription) {
      const statusCode = Number(subscription.endpoint.split("-").at(-1));
      throw Object.assign(new Error("push failed"), { statusCode });
    },
  };
  t.after(() => {
    delete globalThis.__INGEST_WEB_PUSH_MOCK__;
  });
  const deleted = [];
  const previousFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = previousFetch;
  });
  globalThis.fetch = async (input, init = {}) => {
    if (init.method === "DELETE") {
      deleted.push(String(input));
      return new Response(null, { status: 204 });
    }
    return Response.json(rows);
  };
  const push = await server.ssrLoadModule(
    `/src/lib/news/push-server.ts?prune=${Date.now()}`,
  );
  assert.equal(
    await push.sendPushForStories([
      { id: "4", source: "favorite", title: "favorite" },
    ]),
    0,
  );
  assert.equal(deleted.length, 2);
  for (const status of [404, 410]) {
    assert.ok(
      deleted.some(
        (url) =>
          url.includes(`user_id=eq.user-${status}`) &&
          url.includes(`device-${status}`),
      ),
    );
  }
  assert.equal(deleted.some((url) => /user-(401|403)/.test(url)), false);
});

test("push stops before the next send or prune after lease loss", async (t) => {
  setEnv(t, {
    SUPABASE_SECRET_KEY: "sb_secret_push_test",
    VAPID_PUBLIC_KEY: "public-test",
    VAPID_PRIVATE_KEY: "private-test",
  });
  const previousFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = previousFetch;
    delete globalThis.__INGEST_WEB_PUSH_MOCK__;
  });

  let sends = 0;
  globalThis.__INGEST_WEB_PUSH_MOCK__ = {
    setVapidDetails() {},
    async sendNotification() {
      sends += 1;
    },
  };
  globalThis.fetch = async () => Response.json(pushRows([200, 201]));
  const push = await server.ssrLoadModule(
    `/src/lib/news/push-server.ts?lease-send=${Date.now()}`,
  );
  let checks = 0;
  await assert.rejects(
    () =>
      push.sendPushForStories(
        [{ id: "4", source: "favorite", title: "favorite" }],
        async () => {
          checks += 1;
          if (checks === 2) throw new Error("ingest_lock_lost");
        },
      ),
    /ingest_lock_lost/,
  );
  assert.equal(sends, 1);

  let deletes = 0;
  checks = 0;
  globalThis.__INGEST_WEB_PUSH_MOCK__.sendNotification = async () => {
    throw Object.assign(new Error("expired"), { statusCode: 410 });
  };
  globalThis.fetch = async (_input, init = {}) => {
    if (init.method === "DELETE") {
      deletes += 1;
      return new Response(null, { status: 204 });
    }
    return Response.json(pushRows([410]));
  };
  const prune = await server.ssrLoadModule(
    `/src/lib/news/push-server.ts?lease-prune=${Date.now()}`,
  );
  await assert.rejects(
    () =>
      prune.sendPushForStories(
        [{ id: "4", source: "favorite", title: "favorite" }],
        async () => {
          checks += 1;
          if (checks === 2) throw new Error("ingest_lock_lost");
        },
      ),
    /ingest_lock_lost/,
  );
  assert.equal(deletes, 0);
});

test("last-post gap fill checks ownership before persisting", async (t) => {
  setEnv(t, {
    SUPABASE_SECRET_KEY: "sb_secret_ingest_test",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_ingest_test",
  });
  const previousFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = previousFetch;
  });
  let writes = 0;
  globalThis.fetch = async (_input, init = {}) => {
    if (init.method === "POST") {
      writes += 1;
      return new Response(null, { status: 201 });
    }
    return Response.json([
      {
        post_id: "123",
        posted_at: "2026-08-16T12:00:00.000Z",
        content: "last post",
        post_url: "https://x.com/source/status/123",
      },
    ]);
  };
  const store = await server.ssrLoadModule(
    `/src/lib/news/last-post-store.ts?lease-gap=${Date.now()}`,
  );
  await assert.rejects(
    () =>
      store.fillMissingLastPosts(["source"], async () => {
        throw new Error("ingest_lock_lost");
      }),
    /ingest_lock_lost/,
  );
  assert.equal(writes, 0);
});

test("ingest wires confirmed rows and a renewable owner lease", () => {
  const source = read("src/lib/news/ingest.ts");
  const lease = read("src/lib/news/ingest-lease.ts");
  assert.match(source, /new Set\(written\.confirmedIds\)/);
  assert.match(source, /persistedRows\s*=\s*rows\.filter/);
  assert.match(source, /invalidateSupabaseList/);
  assert.doesNotMatch(source, /storiesFromDbPosts|CACHE_KEYS\.list|cloudKvSet/);
  assert.match(source, /persistedRows\.map\(\(r\) =>/);
  assert.doesNotMatch(source, /written\.ok && rows\.length/);
  assert.match(source, /runIngestWithRss/);
  assert.match(read("src/lib/news/ingest-wrap.ts"), /acquireIngestLease/);
  assert.match(lease, /randomUUID/);
  assert.match(lease, /setInterval/);
  assert.match(lease, /renewCacheLease/);
  assert.match(read("src/lib/news/ingest-wrap.ts"), /finally\s*{[\s\S]*lease\.release/);
  assert.match(source, /confirmed:[\s\S]*failed:/);
  assert.match(source, /confirmedIds:\s*written\.confirmedIds/);
  assert.match(source, /failedIds:\s*written\.failedIds/);
  assert.doesNotMatch(source, /catch\s*{\s*return \{ handle, list: \[\]/);
  const cacheEffects = source.slice(
    source.indexOf("if (persistedRows.length)"),
    source.indexOf("let pushed"),
  );
  const pushEffects = source.slice(
    source.indexOf("if (persistedRows.length)", source.indexOf("let pushed")),
    source.indexOf("let profiles"),
  );
  assert.doesNotMatch(cacheEffects, /try\s*{[\s\S]*await assertOwned/);
  assert.doesNotMatch(pushEffects, /try\s*{[\s\S]*await assertOwned/);
});

test("host cron uses bounded transient curl retries", () => {
  const source = read("scripts/ingest-cron.sh");
  assert.match(source, /exec curl -fsS/);
  assert.match(source, /--connect-timeout\s+5/);
  assert.match(source, /--max-time\s+600/);
  assert.match(source, /--retry\s+2/);
  assert.match(source, /--retry-delay\s+2/);
  assert.doesNotMatch(source, /--retry-max-time/);
  assert.match(source, /--retry-connrefused/);
  assert.doesNotMatch(source, /--retry-all-errors/);
});

test("host cron forwards retry flags and preserves curl failure", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "agora-ingest-cron-"));
  const fakeCurl = join(dir, "curl");
  const log = join(dir, "args.log");
  writeFileSync(
    fakeCurl,
    '#!/bin/sh\nprintf "%s\\n" "$@" > "$FAKE_CURL_LOG"\nexit 22\n',
  );
  chmodSync(fakeCurl, 0o755);
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  const run = spawnSync(
    "bash",
    [fileURLToPath(new URL("../scripts/ingest-cron.sh", import.meta.url))],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${dir}:${process.env.PATH || ""}`,
        CRON_SECRET: "test-cron-secret",
        FAKE_CURL_LOG: log,
      },
    },
  );
  assert.equal(run.status, 22);
  const args = readFileSync(log, "utf8").split("\n");
  for (const arg of [
    "-fsS",
    "--connect-timeout",
    "--max-time",
    "--retry",
    "--retry-delay",
    "--retry-connrefused",
    "-X",
    "POST",
  ]) {
    assert.ok(args.includes(arg), `missing curl argument: ${arg}`);
  }
  assert.equal(args.includes("--retry-max-time"), false);
  assert.equal(args.includes("--retry-all-errors"), false);
});
