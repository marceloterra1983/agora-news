import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const completeProductionEnv = {
  AGORA_RUNTIME_MODE: "production",
  DATABASE_URL: "postgres://test.invalid/app",
  BETTER_AUTH_URL: "https://news.automatizems.com",
  BETTER_AUTH_SECRET: "test-better-auth-secret",
  AUTH_ALLOWED_EMAIL: "owner@example.com",
  SUPABASE_SECRET_KEY: "sb_secret_test",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  VAPID_PUBLIC_KEY: "test-vapid-public",
  VAPID_PRIVATE_KEY: "test-vapid-private",
  CRON_SECRET: "test-cron-secret",
};

test("production fails closed when persistent runtime configuration is incomplete", async () => {
  const { assertSafeRuntimeConfig } = await import("../src/lib/runtime-config.ts");

  assert.doesNotThrow(() => assertSafeRuntimeConfig(completeProductionEnv));

  const incomplete = { ...completeProductionEnv, DATABASE_URL: "  " };
  assert.throws(
    () => assertSafeRuntimeConfig(incomplete),
    (error) => {
      assert.equal(
        error.message,
        "Missing required production environment variables: DATABASE_URL",
      );
      assert.doesNotMatch(error.message, /postgres|secret_test|client-secret/);
      return true;
    },
  );
});

test("auth production config is persistent and origin-bound", async (t) => {
  const { createServer } = await import("vite");
  const server = await createServer({
    configFile: false,
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  const { productionAuthConfig } = await server.ssrLoadModule(
    "/src/lib/auth/runtime-config.ts",
  );
  t.after(() => server.close());
  const config = productionAuthConfig(completeProductionEnv);

  assert.equal(config?.baseURL, "https://news.automatizems.com");
  assert.equal(config?.databaseUrl, "postgres://test.invalid/app");
  assert.deepEqual(config?.trustedOrigins, ["https://news.automatizems.com"]);
  assert.deepEqual(config?.ipAddressHeaders, ["x-real-ip"]);
  assert.equal(
    productionAuthConfig({ AGORA_RUNTIME_MODE: "preview" }),
    undefined,
  );
  assert.throws(
    () =>
      productionAuthConfig({
        ...completeProductionEnv,
        VITE_AUTH_ENABLED: "false",
      }),
    /Auth cannot be disabled in production/,
  );
});

test("Supabase API keys use apikey without legacy bearer fallback", async (t) => {
  const { createServer } = await import("vite");
  const server = await createServer({
    configFile: false,
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  t.after(() => server.close());

  const { supabaseApiKeyHeaders } = await server.ssrLoadModule(
    "/src/lib/news/supabase-rest.ts",
  );
  assert.deepEqual(supabaseApiKeyHeaders("sb_publishable_test"), {
    apikey: "sb_publishable_test",
  });
  assert.throws(() => supabaseApiKeyHeaders("  "), /missing_supabase_api_key/);

  const previous = {
    current: process.env.SUPABASE_SECRET_KEY,
    legacy: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  t.after(() => {
    if (previous.current === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = previous.current;
    if (previous.legacy === undefined)
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previous.legacy;
  });
  process.env.SUPABASE_SECRET_KEY = "sb_secret_current_test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "legacy_must_not_win";

  const { adminHeaders } = await server.ssrLoadModule(
    `/src/lib/news/admin.ts?apikey-only=${Date.now()}`,
  );
  assert.deepEqual(adminHeaders(), {
    apikey: "sb_secret_current_test",
    Accept: "application/json",
    "Content-Type": "application/json",
  });
  delete process.env.SUPABASE_SECRET_KEY;
  assert.throws(() => adminHeaders(), /missing_supabase_secret_key/);
});

test("Supabase public reads use only the runtime publishable key", async (t) => {
  const previous = {
    current: process.env.SUPABASE_PUBLISHABLE_KEY,
    legacy: process.env.SUPABASE_ANON_KEY,
  };
  t.after(() => {
    if (previous.current === undefined)
      delete process.env.SUPABASE_PUBLISHABLE_KEY;
    else process.env.SUPABASE_PUBLISHABLE_KEY = previous.current;
    if (previous.legacy === undefined) delete process.env.SUPABASE_ANON_KEY;
    else process.env.SUPABASE_ANON_KEY = previous.legacy;
  });
  process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_current_test";
  process.env.SUPABASE_ANON_KEY = "legacy_must_not_win";

  const { createServer } = await import("vite");
  const server = await createServer({
    configFile: false,
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  t.after(() => server.close());
  const { supabaseReadHeaders } = await server.ssrLoadModule(
    `/src/lib/news/supabase.ts?publishable-only=${Date.now()}`,
  );

  assert.deepEqual(supabaseReadHeaders(), {
    apikey: "sb_publishable_current_test",
    Accept: "application/json",
    Prefer: "count=none",
  });
  delete process.env.SUPABASE_PUBLISHABLE_KEY;
  assert.throws(() => supabaseReadHeaders(), /missing_supabase_publishable_key/);

  const legacyScan = spawnSync(
    "git",
    [
      "grep",
      "-l",
      "-E",
      "SUPABASE_(ANON_KEY|SERVICE_ROLE_KEY|SERVICE_KEY)|VITE_SUPABASE_ANON_KEY|eyJhbGciOiJIUzI1Ni",
      "--",
      "src",
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  assert.equal(legacyScan.status, 1, "tracked legacy Supabase credential remains");
});

test("VAPID mismatch replaces the browser subscription with the current key", async () => {
  const notifyCore = await import("../src/lib/news/notify-core.mjs");
  const events = [];
  const previousKey = Uint8Array.of(1, 2, 3);
  const currentKey = Uint8Array.of(4, 5, 6);
  const previous = {
    endpoint: "https://push.test.invalid/previous",
    options: { applicationServerKey: previousKey.buffer },
    async unsubscribe() {
      events.push("unsubscribe");
      return true;
    },
  };
  const replacement = { endpoint: "https://push.test.invalid/current" };
  const pushManager = {
    async getSubscription() {
      events.push("get");
      return previous;
    },
    async subscribe(options) {
      events.push("subscribe");
      assert.equal(options.userVisibleOnly, true);
      assert.deepEqual(
        [...new Uint8Array(options.applicationServerKey)],
        [...currentKey],
      );
      return replacement;
    },
  };

  assert.equal(
    typeof notifyCore.ensureCurrentPushSubscription,
    "function",
    "missing VAPID rotation behavior",
  );
  const result = await notifyCore.ensureCurrentPushSubscription(
    pushManager,
    currentKey,
  );

  assert.deepEqual(events, ["get", "unsubscribe", "subscribe"]);
  assert.equal(result.subscription, replacement);
  assert.equal(result.replacedEndpoint, previous.endpoint);
});

test("VAPID server identity is env-only and lazy", async (t) => {
  const previous = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
  };
  t.after(() => {
    if (previous.publicKey === undefined) delete process.env.VAPID_PUBLIC_KEY;
    else process.env.VAPID_PUBLIC_KEY = previous.publicKey;
    if (previous.privateKey === undefined) delete process.env.VAPID_PRIVATE_KEY;
    else process.env.VAPID_PRIVATE_KEY = previous.privateKey;
  });
  process.env.VAPID_PUBLIC_KEY = "test-current-public";
  process.env.VAPID_PRIVATE_KEY = "test-current-private";

  const { createServer } = await import("vite");
  const server = await createServer({
    configFile: false,
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  t.after(() => server.close());
  const { vapidConfig } = await server.ssrLoadModule(
    "/src/lib/news/push-config.ts",
  );

  assert.deepEqual(vapidConfig(), {
    publicKey: "test-current-public",
    privateKey: "test-current-private",
  });
  delete process.env.VAPID_PRIVATE_KEY;
  assert.throws(() => vapidConfig(), /missing_vapid_configuration/);

  const { existsSync } = await import("node:fs");
  assert.equal(
    existsSync(new URL("../src/lib/news/vapid-public.ts", import.meta.url)),
    false,
    "tracked VAPID public key module remains",
  );
});

test("production build is hermetic and migration is explicit", () => {
  const pkg = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  );
  assert.equal(pkg.scripts.build, "vite build");
  assert.equal(pkg.scripts["db:migrate"], "node scripts/migrate.mjs");
  const dockerfile = readFileSync(
    new URL("../Dockerfile", import.meta.url),
    "utf8",
  );
  assert.match(dockerfile, /COPY[^\n]*scripts\/migrate\.mjs/);
  assert.match(dockerfile, /COPY[^\n]*migrations/);
});

test("configuration requires an explicit recognized runtime mode", async () => {
  const { assertSafeRuntimeConfig } = await import("../src/lib/runtime-config.ts");

  for (const AGORA_RUNTIME_MODE of [undefined, "prodution", ""]) {
    assert.throws(
      () => assertSafeRuntimeConfig({ AGORA_RUNTIME_MODE }),
      /AGORA_RUNTIME_MODE must be one of: production, preview, local/,
    );
  }
  assert.doesNotThrow(() =>
    assertSafeRuntimeConfig({ AGORA_RUNTIME_MODE: "preview" }),
  );
  assert.doesNotThrow(() =>
    assertSafeRuntimeConfig({ AGORA_RUNTIME_MODE: "local" }),
  );
});

test("Nitro runtime bootstrap validates production but not preview", () => {
  const env = { ...process.env, AGORA_RUNTIME_MODE: "production" };
  for (const key of [
    "DATABASE_URL",
    "BETTER_AUTH_URL",
    "BETTER_AUTH_SECRET",
    "AUTH_ALLOWED_EMAIL",
    "SUPABASE_SECRET_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "VAPID_PUBLIC_KEY",
    "VAPID_PRIVATE_KEY",
    "CRON_SECRET",
  ]) {
    delete env[key];
  }
  const args = [
    "--input-type=module",
    "--eval",
    'import("vite").then(async ({ createServer }) => { const server = await createServer({ configFile: false, logLevel: "silent", server: { middlewareMode: true } }); try { const module = await server.ssrLoadModule("/server/plugins/runtime-config.ts"); module.default(); } finally { await server.close(); } })',
  ];

  const production = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
  assert.notEqual(production.status, 0);
  assert.match(
    production.stderr,
    /Missing required production environment variables: DATABASE_URL/,
  );

  const preview = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    env: { ...env, AGORA_RUNTIME_MODE: "preview" },
    encoding: "utf8",
  });
  assert.equal(preview.status, 0, preview.stderr);
});
