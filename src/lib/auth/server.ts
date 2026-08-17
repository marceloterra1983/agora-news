/** Self-hosted Better Auth with native email/password sign-in. */
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { getCookie } from "@tanstack/react-start/server";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { ensureDbReady, getPglite } from "../db";
import { emailAndPasswordEnabled } from "./email-password";
import { pgliteDialect } from "./pglite-dialect";
import { productionAuthConfig } from "./runtime-config";

/**
 * Preview secret must outlive module reloads: PGLite (and its session rows) is
 * stored on `globalThis`, so an HMR re-eval of this file must NOT mint a new
 * signing secret or every existing session becomes invalid mid-dev. Process
 * restart clears both the secret and PGLite together.
 */
const globalAuthRef = globalThis as typeof globalThis & {
  __authPreviewSecret__?: string;
};
function previewAuthSecret(): string {
  globalAuthRef.__authPreviewSecret__ ??= randomBytes(32).toString("hex");
  return globalAuthRef.__authPreviewSecret__;
}

/** Read an env var, treating empty/whitespace as unset. */
const env = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

const production = productionAuthConfig(process.env);

// Kick (and share) DB bootstrap only after production config has failed closed.
void ensureDbReady();

// Explicit off-switch. The deployer sets `VITE_AUTH_ENABLED=true` when it
// provisions auth; set it to "false" to force auth off everywhere (dev user).
const authDisabled = env("VITE_AUTH_ENABLED") === "false";
const allowedEmail = (
  production?.allowedEmail ?? env("AUTH_ALLOWED_EMAIL") ?? ""
).trim().toLowerCase();
const bootstrapSignupEnabled = env("AUTH_BOOTSTRAP_SIGNUP") === "true";

/** True when native email/password sign-in is active. */
export const authConfigured =
  !authDisabled && Boolean(production?.allowedEmail ?? env("AUTH_ALLOWED_EMAIL"));

const explicitBaseURL = production?.baseURL ?? env("BETTER_AUTH_URL");
// Local `npm run dev` (port 8080 contract). Browsers may send Origin as any of
// these for the same server — trusting only `localhost` rejects `127.0.0.1` and
// breaks email/password with "Invalid origin".
const LOCAL_DEV_ORIGINS: string[] = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://[::1]:8080",
];
const baseURL = explicitBaseURL ?? "http://localhost:8080";

// Origins Better Auth accepts on credentialed POSTs (sign-up/sign-in, etc.).
// Missing entries here surface as FORBIDDEN "Invalid origin".
const trustedOrigins: string[] = production
  ? production.trustedOrigins
  : explicitBaseURL
    ? [explicitBaseURL, ...LOCAL_DEV_ORIGINS]
    : LOCAL_DEV_ORIGINS;

const databaseUrl = production?.databaseUrl ?? env("DATABASE_URL");

// Real Postgres when `DATABASE_URL` is set (deployed apps), else the app's
// embedded PGLite (preview) via a Kysely dialect — so Better Auth persists to the
// SAME DB as app data, including email/password users. Both use the Better Auth
// schema from `migrations/0001_auth.sql`.
const database = databaseUrl
  ? new Pool({ connectionString: databaseUrl })
  : { dialect: pgliteDialect(() => getPglite()), type: "postgres" as const };

/** Session token cookie name — also read by the live-preview popup completion page. */
export const SESSION_TOKEN_COOKIE = "__Host-grok-auth.session_token";

export const auth = betterAuth({
  baseURL,
  // Deployed apps inject BETTER_AUTH_SECRET. Preview: process-stable secret on
  // globalThis so HMR doesn't invalidate PGLite-backed sessions (see above).
  secret:
    production?.secret ?? env("BETTER_AUTH_SECRET") ?? previewAuthSecret(),
  database,

  // CSRF / origin check for credentialed auth POSTs (email sign-up/sign-in, …).
  // See `trustedOrigins` construction above — must cover live preview hosts AND
  // local loopback variants, or clients get "Invalid origin".
  trustedOrigins,

  // Cache the session in the short-lived signed `session_data` cookie so reads
  // (incl. the client's `/get-session`) skip the DB — this shrinks the "loading"
  // window and reduces auth flicker. See the `auth` skill for the full
  // flicker-prevention guidance (gate on `isPending`; SSR the session).
  session: { cookieCache: { enabled: true, maxAge: 300 } },

  ...(emailAndPasswordEnabled
    ? {
        emailAndPassword: {
          enabled: true,
          disableSignUp: !bootstrapSignupEnabled,
          minPasswordLength: 6,
          maxPasswordLength: 128,
        },
      }
    : {}),

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/email" && ctx.path !== "/sign-up/email") return;
      const email =
        typeof ctx.body?.email === "string"
          ? ctx.body.email.trim().toLowerCase()
          : "";
      if (email !== allowedEmail) {
        throw new APIError("FORBIDDEN", { message: "Email não autorizado" });
      }
      if (ctx.path === "/sign-up/email" && !bootstrapSignupEnabled) {
        throw new APIError("FORBIDDEN", { message: "Cadastro temporariamente fechado" });
      }
    }),
  },

  // `__Host-` prefixed cookies: the browser REFUSES any same-named cookie that
  // carries a `Domain` attribute, so a sibling `*.grok.me` app cannot "toss" a
  // `Domain=.grok.me` session cookie onto this app. `__Host-` requires Secure +
  // Path=/ + no Domain; Better Auth otherwise uses `__Secure-` (which permits
  // Domain), so we drop its auto prefix (`useSecureCookies: false`) and set
  // Secure + the names ourselves. (Browsers allow Secure cookies on
  // `http://localhost`, so local dev still works.)
  advanced: {
    ipAddress: {
      ipAddressHeaders: production?.ipAddressHeaders ?? ["x-real-ip"],
    },
    useSecureCookies: false,
    defaultCookieAttributes: { secure: true, sameSite: "lax", path: "/" },
    cookies: {
      session_token: { name: SESSION_TOKEN_COOKIE },
      session_data: { name: "__Host-grok-auth.session_data" },
      account_data: { name: "__Host-grok-auth.account_data" },
      dont_remember: { name: "__Host-grok-auth.dont_remember" },
    },
  },

  plugins: [
    // Bridges Better Auth's Set-Cookie into TanStack Start responses. MUST be
    // last so it runs after every other plugin's hooks.
    tanstackStartCookies(),
  ],
});

export function readSessionToken(): string | null {
  return getCookie(SESSION_TOKEN_COOKIE) ?? null;
}
