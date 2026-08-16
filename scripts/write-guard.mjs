/**
 * Regras de escrita da API Agora.
 * Fonte única — o TS em src/lib/news/write-guard.ts reexporta este módulo.
 *
 * app: só fetch same-origin (PWA). Bloqueia curl e CSRF cross-site.
 * ingest: se CRON_SECRET existir, exige Bearer; senão aceita cron Vercel,
 *         same-origin, ou cliente sem Sec-Fetch-Site (cron/curl legado).
 * ops: same-origin ou cron Vercel (ex.: /api/cache).
 */

/** @typedef {"app" | "ingest" | "ops"} WriteKind */

/**
 * @param {WriteKind} kind
 * @param {{ site?: string | null, authorization?: string | null, vercelCron?: string | null, userAgent?: string | null }} headers
 * @param {{ cronSecret?: string }} [env]
 */
export function writeAllowed(kind, headers, env = {}) {
  const site = String(headers.site || "");
  if (site === "cross-site" || site === "same-site") return false;

  if (kind === "app") return site === "same-origin";

  const ua = String(headers.userAgent || "");
  const isVercelCron =
    headers.vercelCron === "1" || ua.toLowerCase().startsWith("vercel-cron");

  if (kind === "ops") return site === "same-origin" || isVercelCron;

  const secret = String(env.cronSecret || "").trim();
  const auth = String(headers.authorization || "");
  if (secret) return auth === `Bearer ${secret}`;
  if (isVercelCron || site === "same-origin") return true;
  return !site || site === "none";
}

/**
 * @param {WriteKind} kind
 * @param {{ cronSecret?: string }} [env]
 */
export function writeDenialStatus(kind, env = {}) {
  if (kind === "ingest" && String(env.cronSecret || "").trim()) return 401;
  return 403;
}
