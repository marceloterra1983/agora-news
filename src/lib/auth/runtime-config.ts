import { assertSafeRuntimeConfig, type RuntimeEnv } from "../runtime-config";

export function productionAuthConfig(env: RuntimeEnv = process.env) {
  if (env.AGORA_RUNTIME_MODE?.trim() !== "production") return undefined;
  assertSafeRuntimeConfig(env);

  const baseURL = env.BETTER_AUTH_URL!.trim();
  return {
    baseURL,
    databaseUrl: env.DATABASE_URL!.trim(),
    secret: env.BETTER_AUTH_SECRET!.trim(),
    allowedEmail: env.AUTH_ALLOWED_EMAIL!.trim().toLowerCase(),
    trustedOrigins: [baseURL],
    ipAddressHeaders: ["x-real-ip"],
  };
}
