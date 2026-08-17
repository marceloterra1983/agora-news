export type RuntimeEnv = Record<string, string | undefined>;
export type RuntimeMode = "production" | "preview" | "local";

const REQUIRED_PRODUCTION_ENV = [
  "DATABASE_URL",
  "BETTER_AUTH_URL",
  "BETTER_AUTH_SECRET",
  "AUTH_ALLOWED_EMAIL",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "CRON_SECRET",
] as const;

export function assertSafeRuntimeConfig(
  env: RuntimeEnv = process.env,
): RuntimeMode {
  const mode = env.AGORA_RUNTIME_MODE?.trim();
  if (mode !== "production" && mode !== "preview" && mode !== "local") {
    throw new Error(
      "AGORA_RUNTIME_MODE must be one of: production, preview, local",
    );
  }
  if (mode !== "production") return mode;
  const missing = REQUIRED_PRODUCTION_ENV.filter((key) => !env[key]?.trim());
  if (missing.length) {
    throw new Error(
      `Missing required production environment variables: ${missing.join(", ")}`,
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.AUTH_ALLOWED_EMAIL!.trim())) {
    throw new Error("AUTH_ALLOWED_EMAIL must be a valid email address");
  }
  if (env.VITE_AUTH_ENABLED?.trim() === "false") {
    throw new Error("Auth cannot be disabled in production");
  }
  return mode;
}
