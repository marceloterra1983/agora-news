import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("production auth uses the allowlisted email without broker credentials", async () => {
  const { assertSafeRuntimeConfig } = await import(
    "../src/lib/runtime-config.ts?single-user-email-auth"
  );

  assert.doesNotThrow(() =>
    assertSafeRuntimeConfig({
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
    }),
  );
});

test("production auth rejects an invalid allowlisted email", async () => {
  const { assertSafeRuntimeConfig } = await import(
    "../src/lib/runtime-config.ts?single-user-email-validation"
  );
  const base = {
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

  assert.throws(
    () =>
      assertSafeRuntimeConfig({
        ...base,
        AUTH_ALLOWED_EMAIL: "owner-without-domain",
      }),
    /AUTH_ALLOWED_EMAIL/,
  );
});

test("production auth config exposes only the native email identity", async (t) => {
  const { createServer } = await import("vite");
  const server = await createServer({
    configFile: false,
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  t.after(() => server.close());

  const { productionAuthConfig } = await server.ssrLoadModule(
    "/src/lib/auth/runtime-config.ts",
  );
  const config = productionAuthConfig({
    AGORA_RUNTIME_MODE: "production",
    DATABASE_URL: "postgres://test.invalid/app",
    BETTER_AUTH_URL: "https://news.automatizems.com",
    BETTER_AUTH_SECRET: "test-better-auth-secret",
    AUTH_ALLOWED_EMAIL: " Owner@Example.com ",
    SUPABASE_SECRET_KEY: "sb_secret_test",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    VAPID_PUBLIC_KEY: "test-vapid-public",
    VAPID_PRIVATE_KEY: "test-vapid-private",
    CRON_SECRET: "test-cron-secret",
  });

  assert.equal(config?.allowedEmail, "owner@example.com");
  assert.equal("grokIssuer" in (config ?? {}), false);
});

test("native email and password authentication is enabled", async () => {
  const { emailAndPasswordEnabled } = await import(
    "../src/lib/auth/email-password.ts?single-user-email-enabled"
  );
  assert.equal(emailAndPasswordEnabled, true);
});

test("auth server no longer wires the broker provider", () => {
  const source = readFileSync(
    new URL("../src/lib/auth/server.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /genericOAuth|GROK_PROVIDERS|PREVIEW_CLIENT_SECRET/);
  assert.equal(
    existsSync(new URL("../src/lib/auth/preview.ts", import.meta.url)),
    false,
  );
});

test("the broker popup integration is removed", () => {
  const viteConfig = readFileSync(
    new URL("../vite.config.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(viteConfig, /authPopupPlugin|popup\.server/);
  assert.equal(
    existsSync(new URL("../src/lib/auth/popup.server.ts", import.meta.url)),
    false,
  );
});

test("browser auth exposes email sign-in instead of broker providers", () => {
  const client = readFileSync(
    new URL("../src/lib/auth/client.ts", import.meta.url),
    "utf8",
  );
  const login = readFileSync(
    new URL("../src/routes/login.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(client, /genericOAuthClient|GROK_PROVIDERS|signIn\.oauth2/);
  assert.doesNotMatch(login, /GROK_PROVIDERS|GoogleMark|XLogo/);
  assert.equal(
    existsSync(new URL("../src/lib/auth/providers.ts", import.meta.url)),
    false,
  );
});

test("server auth uses the same-origin session cookie only", () => {
  const middleware = readFileSync(
    new URL("../src/lib/auth/middleware.ts", import.meta.url),
    "utf8",
  );
  const verify = readFileSync(
    new URL("../src/lib/auth/verify.server.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(middleware, /getBearerToken|bearerToken/);
  assert.doesNotMatch(verify, /bearerToken|Authorization.*Bearer/);
});

test("email auth gates sign-in and temporary bootstrap signup by one allowlist", () => {
  const server = readFileSync(
    new URL("../src/lib/auth/server.ts", import.meta.url),
    "utf8",
  );
  assert.match(server, /AUTH_BOOTSTRAP_SIGNUP/);
  assert.match(server, /sign-up\/email/);
  assert.match(server, /sign-in\/email/);
});

test("login exposes the temporary account bootstrap form", () => {
  const login = readFileSync(
    new URL("../src/routes/login.tsx", import.meta.url),
    "utf8",
  );
  assert.match(login, /signUp/);
  assert.match(login, /cadastro/);
  assert.match(login, /raw\.cadastro === "true"/);
  assert.match(login, /Criar conta/);
});

test("native email auth accepts passwords from six characters", () => {
  const server = readFileSync(
    new URL("../src/lib/auth/server.ts", import.meta.url),
    "utf8",
  );
  const login = readFileSync(
    new URL("../src/routes/login.tsx", import.meta.url),
    "utf8",
  );
  assert.match(server, /minPasswordLength: 6/);
  assert.match(login, /minLength=\{6\}/);
});
