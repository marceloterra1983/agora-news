import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("schema denies direct Data API access to every domain table", () => {
  const sql = read("scripts/supabase-domain-tables.sql");

  for (const table of [
    "x_profiles",
    "user_watches",
    "user_prefs",
    "push_subscriptions",
  ]) {
    assert.match(
      sql,
      new RegExp(`create table if not exists public\\.${table}`),
    );
    assert.match(
      sql,
      new RegExp(`alter table public\\.${table} enable row level security`),
    );
    assert.match(
      sql,
      new RegExp(`alter table public\\.${table} force row level security`),
    );
    assert.match(
      sql,
      new RegExp(`revoke all on public\\.${table} from public, anon, authenticated`),
    );
    assert.match(
      sql,
      new RegExp(`grant all on public\\.${table} to service_role`),
    );
  }
  assert.match(sql, /user_id text not null/);
  assert.match(sql, /primary key \(user_id, section, handle\)/);
  assert.match(sql, /endpoint text not null unique/);
  assert.match(sql, /push_subscriptions_user_required[\s\S]*not valid/);
  assert.match(
    sql,
    /push_subscriptions_provider_endpoint[\s\S]*fcm\\\.googleapis\\\.com[\s\S]*push\\\.services\\\.mozilla\\\.com/,
  );
  assert.match(
    sql,
    /validate constraint push_subscriptions_provider_endpoint/,
  );
  assert.match(sql, /user_watches_owner_handle_idx/);
  assert.match(
    sql,
    /create unique index if not exists push_subscriptions_endpoint_idx\s+on public\.push_subscriptions \(endpoint\);/,
  );
  assert.doesNotMatch(sql, /create policy/i);
});

test("watch reads and deletes are owner-scoped while cron union is deduplicated", async (t) => {
  const previousSecret = process.env.SUPABASE_SECRET_KEY;
  process.env.SUPABASE_SECRET_KEY = "sb_secret_watch_test";
  t.after(() => {
    if (previousSecret === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = previousSecret;
  });

  const { createServer } = await import("vite");
  const server = await createServer({
    configFile: false,
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  t.after(() => server.close());
  const watch = await server.ssrLoadModule(
    `/src/lib/news/watch.ts?owner-test=${Date.now()}`,
  );

  const calls = [];
  const previousFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = previousFetch;
  });
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    calls.push({ url, init });
    if (init.method === "POST") return new Response(null, { status: 201 });
    if (init.method === "DELETE") return new Response(null, { status: 204 });
    if (url.includes("user_id=eq.user-a")) {
      return Response.json([
        {
          handle: "alice",
          name: "Alice",
          avatar: null,
          summary: "A",
          followers: 1,
          section: "ai",
        },
      ]);
    }
    if (url.includes("user_id=eq.user-b")) {
      return Response.json([
        {
          handle: "bob",
          name: "Bob",
          avatar: null,
          summary: "B",
          followers: 2,
          section: "tech",
        },
      ]);
    }
    return Response.json([
      { handle: "alice", name: "Alice", section: "ai" },
      { handle: "ALICE", name: "Alice 2", section: "tech" },
      { handle: "bob", name: "Bob", section: "tech" },
    ]);
  };

  assert.deepEqual(
    (await watch.listUserWatchAccounts("user-a")).map((row) => row.handle),
    ["alice"],
  );
  assert.deepEqual(
    (await watch.listUserWatchAccounts("user-b")).map((row) => row.handle),
    ["bob"],
  );
  assert.deepEqual(
    (await watch.listAllWatchAccounts()).map((row) => row.handle.toLowerCase()),
    ["alice", "bob"],
  );

  await watch.registerWatch("user-a", {
    handle: "@Alice",
    name: "Alice",
    avatar: null,
    summary: "A",
    followers: 1,
    section: "TECH",
  });
  const posted = JSON.parse(
    calls.find((call) => call.init.method === "POST").init.body,
  );
  assert.equal(posted.user_id, "user-a");
  assert.equal(posted.handle, "alice");
  assert.equal(posted.section, "tech");

  const wiped = await watch.unregisterWatch("user-a", "ALICE");
  assert.equal(wiped, false);
  assert.equal(
    calls.filter((call) => call.init.method === "DELETE").length,
    0,
  );

  await watch.unregisterWatch("user-a", "ALICE", "tech");
  const deletion = calls.find((call) => call.init.method === "DELETE").url;
  assert.match(deletion, /user_id=eq\.user-a/);
  assert.match(deletion, /handle=eq\.alice/);
  assert.match(deletion, /section=eq\.tech/);
  assert.doesNotMatch(deletion, /user-b/);

  const route = read("src/routes/api/watch.ts");
  assert.equal((route.match(/status: ok \? 200 : 502/g) || []).length, 2);
});

test("profile catalog is server-only and never falls back to posts", async (t) => {
  const previousSecret = process.env.SUPABASE_SECRET_KEY;
  process.env.SUPABASE_SECRET_KEY = "sb_secret_profile_test";
  t.after(() => {
    if (previousSecret === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = previousSecret;
  });

  const { createServer } = await import("vite");
  const server = await createServer({
    configFile: false,
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  t.after(() => server.close());
  const store = await server.ssrLoadModule(
    `/src/lib/news/profile-store.ts?profile-test=${Date.now()}`,
  );
  const admin = await server.ssrLoadModule(
    `/src/lib/news/admin.ts?profile-test=${Date.now()}`,
  );

  const calls = [];
  const previousFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = previousFetch;
  });
  globalThis.fetch = async (input, init = {}) => {
    calls.push({ url: String(input), init });
    return new Response(null, { status: 503 });
  };

  await assert.rejects(
    () => store.readStoredProfile("Alice"),
    /profile_read_503/,
  );
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/rest\/v1\/x_profiles/);
  assert.equal(Object.hasOwn(calls[0].init.headers, "Authorization"), false);

  calls.length = 0;
  assert.equal(
    await admin.upsertProfile({
      handle: "Alice",
      name: "Alice",
      bio: "A",
      summary_pt: "A",
      avatar: null,
      followers: 1,
      last_post: null,
    }),
    false,
  );
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/rest\/v1\/x_profiles/);

  const storeSource = read("src/lib/news/profile-store.ts");
  const adminSource = read("src/lib/news/admin.ts");
  const upsertSource = adminSource.slice(
    adminSource.indexOf("export async function upsertProfile"),
    adminSource.indexOf("export async function deletePost"),
  );
  assert.doesNotMatch(storeSource, /rest\/v1\/posts|prfl_|supabaseReadHeaders/);
  assert.doesNotMatch(upsertSource, /rest\/v1\/posts|prfl_|category:\s*["']profile/);
  const profileRoute = read("src/routes/api/profile.ts");
  assert.doesNotMatch(profileRoute, /POST:\s*async|upsertProfile|mergeClientProfile/);
  assert.match(profileRoute, /status:\s*502/);
  assert.doesNotMatch(read("src/lib/news/use-open-x-profile.ts"), /fetch\(["']\/api\/profile/);
  assert.doesNotMatch(read("src/lib/news/profile-store-core.mjs"), /mergeClientProfile/);
});

test("prefs are owner-scoped and dedicated-table failures stay failures", async (t) => {
  const previousSecret = process.env.SUPABASE_SECRET_KEY;
  process.env.SUPABASE_SECRET_KEY = "sb_secret_prefs_test";
  t.after(() => {
    if (previousSecret === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = previousSecret;
  });

  const { createServer } = await import("vite");
  const server = await createServer({
    configFile: false,
    logLevel: "silent",
    resolve: { alias: { "@": new URL("../src", import.meta.url).pathname } },
    server: { middlewareMode: true },
  });
  t.after(() => server.close());
  const prefs = await server.ssrLoadModule(
    `/src/lib/news/prefs-store.server.ts?prefs-test=${Date.now()}`,
  );

  const calls = [];
  const previousFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = previousFetch;
  });
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    calls.push({ url, init });
    if (init.method === "POST") return new Response(null, { status: 201 });
    if (url.includes("user_id=eq.user-a")) {
      return Response.json([
        { prefs: { theme: "dark", _llm: { accounts: [{ key: "xai-secret-abcd" }] } } },
      ]);
    }
    return Response.json([]);
  };

  assert.deepEqual(await prefs.readUserPrefs("user-a"), { theme: "dark" });
  assert.equal(await prefs.readUserPrefs("user-b"), null);
  await prefs.writeUserPrefs("user-a", { theme: "light" });
  const write = calls.find((call) => call.init.method === "POST");
  assert.match(write.url, /\/rest\/v1\/user_prefs\?on_conflict=user_id/);
  const written = JSON.parse(write.init.body);
  assert.equal(written.user_id, "user-a");
  assert.deepEqual(written.prefs._llm, { accounts: [{ key: "xai-secret-abcd" }] });
  assert.equal(written.prefs.theme, "light");
  assert.equal(Object.hasOwn(write.init.headers, "Authorization"), false);

  calls.length = 0;
  globalThis.fetch = async (input, init = {}) => {
    calls.push({ url: String(input), init });
    return new Response(null, { status: 503 });
  };
  await assert.rejects(() => prefs.readUserPrefs("user-a"), /prefs_read_503/);
  await assert.rejects(
    () => prefs.writeUserPrefs("user-a", { theme: "dark" }),
    /prefs_read_503|prefs_write_503/,
  );
  assert.equal(calls.some((call) => call.url.includes("/rest/v1/posts")), false);
  assert.doesNotMatch(read("src/lib/news/prefs-store.server.ts"), /cloudKv|rest\/v1\/posts/);
});

test("push ownership and endpoint validation fail closed", async (t) => {
  const previousSecret = process.env.SUPABASE_SECRET_KEY;
  process.env.SUPABASE_SECRET_KEY = "sb_secret_push_test";
  t.after(() => {
    if (previousSecret === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = previousSecret;
  });

  const { validPushEndpoint } = await import("../src/lib/news/push-core.mjs");
  const endpoint = "https://fcm.googleapis.com/fcm/send/test-token";
  assert.equal(validPushEndpoint(endpoint), true);
  assert.equal(validPushEndpoint("http://fcm.googleapis.com/fcm/send/x"), false);
  assert.equal(validPushEndpoint("https://fcm.googleapis.com.evil.test/x"), false);
  assert.equal(validPushEndpoint("https://127.0.0.1/push"), false);

  const { createServer } = await import("vite");
  const server = await createServer({
    configFile: false,
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  t.after(() => server.close());
  const push = await server.ssrLoadModule(
    `/src/lib/news/push-server.ts?push-test=${Date.now()}`,
  );

  const calls = [];
  const persisted = new Map();
  const previousFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = previousFetch;
  });
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    calls.push({ url, init });
    if (init.method === "POST") {
      const row = JSON.parse(init.body);
      persisted.set(row.endpoint, row);
    }
    if (init.method === "DELETE") {
      const row = persisted.get(endpoint);
      if (row && url.includes(`user_id=eq.${row.user_id}`)) {
        persisted.delete(endpoint);
      }
    }
    return new Response(null, { status: init.method === "DELETE" ? 204 : 201 });
  };
  const sub = {
    endpoint,
    keys: { p256dh: "public-key", auth: "auth-key" },
    handles: ["OpenAI"],
  };
  assert.equal(await push.savePushSub("user-a", sub), true);
  assert.equal(await push.savePushSub("user-b", sub), true);
  const writes = calls.filter((call) => call.init.method === "POST");
  assert.equal(writes.length, 2);
  assert.match(writes[0].url, /on_conflict=endpoint/);
  const rowA = JSON.parse(writes[0].init.body);
  const rowB = JSON.parse(writes[1].init.body);
  assert.equal(rowA.user_id, "user-a");
  assert.equal(rowB.user_id, "user-b");
  assert.equal(rowA.id, rowB.id);
  assert.equal(
    rowA.id,
    `push_${endpoint.replace(/[^a-zA-Z0-9]/g, "").slice(-48)}`,
  );
  assert.equal(persisted.size, 1);
  assert.equal(persisted.get(endpoint).user_id, "user-b");

  assert.equal(await push.deletePushSub("user-a", endpoint), true);
  const deletion = calls.find((call) => call.init.method === "DELETE").url;
  assert.match(deletion, /user_id=eq\.user-a/);
  assert.match(deletion, /endpoint=eq\.https%3A%2F%2Ffcm\.googleapis\.com/);
  assert.equal(persisted.get(endpoint).user_id, "user-b");

  calls.length = 0;
  assert.equal(await push.savePushSub("user-a", { ...sub, endpoint: "https://evil.test/push" }), false);
  assert.equal(calls.length, 0);
  globalThis.fetch = async (input, init = {}) => {
    calls.push({ url: String(input), init });
    return new Response(null, { status: 503 });
  };
  assert.equal(await push.savePushSub("user-a", sub), false);
  assert.equal(calls.length, 1);
  await assert.rejects(() => push.getPushForUser("user-a"), /push_read_503/);

  const source = read("src/lib/news/push-server.ts");
  assert.doesNotMatch(source, /cloudKv|rest\/v1\/posts|deletePost|pickPushList|pushPersisted/);
  assert.match(source, /deletePushSub\(row\.userId, row\.sub\.endpoint\)/);
  const route = read("src/routes/api/push.ts");
  assert.match(route, /deletePushSub\(userId, endpoint\)/);
  assert.match(route, /savePushSub\(userId,/);
  assert.match(route, /status: ok \? 200 : 502/);
});

test("legacy migration exports exact rows, is idempotent and never guesses owners", () => {
  const sql = read("scripts/supabase-private-persistence-migrate.sql");
  assert.match(sql, /create table if not exists public\.legacy_synthetic_posts_export/);
  assert.match(sql, /primary key \(source_table, record_id\)/);
  assert.match(sql, /to_jsonb\(posts\)/);
  assert.match(sql, /on conflict \(source_table, record_id\) do nothing/);
  assert.match(sql, /category in \('profile', 'watch', 'prefs', 'push', 'cache', 'x-last'\)/);
  assert.match(sql, /post_id ~\* '\^\(prfl_\|watch_\|last_\|kv_\|push_\)'/);
  assert.match(sql, /jsonb_typeof\(payload\) = 'object'/);
  assert.match(sql, /on conflict \(user_id\) do nothing/);
  assert.match(sql, /on conflict \(endpoint\)/);
  assert.match(
    sql,
    /'push_' \|\| right\(regexp_replace\(endpoint_value, '\[\^A-Za-z0-9\]', '', 'g'\), 48\)/,
  );
  assert.doesNotMatch(sql, /insert into public\.user_watches/i);
  assert.doesNotMatch(sql, /delete\s+from\s+public\.(posts|push_subscriptions)/i);
  assert.match(sql, /order by source_table, record_id/);
});

test("private stores have no synthetic-post write or read path", () => {
  for (const path of [
    "src/lib/news/watch.ts",
    "src/lib/news/profile-store.ts",
    "src/lib/news/prefs-server.ts",
    "src/lib/news/prefs-store.server.ts",
    "src/lib/news/push-server.ts",
  ]) {
    const source = read(path);
    assert.doesNotMatch(source, /rest\/v1\/posts|upsertPosts|cloudKv/);
  }
  const admin = read("src/lib/news/admin.ts");
  const profile = admin.slice(
    admin.indexOf("export async function upsertProfile"),
    admin.indexOf("export async function deletePost"),
  );
  assert.doesNotMatch(profile, /rest\/v1\/posts|prfl_|category:\s*["']profile/);
});
