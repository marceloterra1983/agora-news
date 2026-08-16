/**
 * Regras de escrita da API Agora.
 * Fonte única — o TS em src/lib/news/write-guard.ts reexporta este módulo.
 *
 * app: só fetch same-origin (PWA). Bloqueia curl e CSRF cross-site.
 * ingest: só Bearer ${CRON_SECRET}. Sem secret, ninguém passa (fail-closed).
 * ops: só same-origin (ex.: /api/cache).
 */

/** @typedef {"app" | "ingest" | "ops"} WriteKind */

/**
 * @param {WriteKind} kind
 * @param {{ site?: string | null, authorization?: string | null, userAgent?: string | null, userId?: string | null }} headers
 * @param {{ cronSecret?: string, userId?: string }} [env]
 */
export function writeAllowed(kind, headers, env = {}) {
  const site = String(headers.site || "");
  if (site === "cross-site" || site === "same-site") return false;

  if (kind === "app") {
    const userId = String(headers.userId || env.userId || "").trim();
    return site === "same-origin" && Boolean(userId);
  }
  if (kind === "ops") return site === "same-origin";

  const secret = String(env.cronSecret || "").trim();
  const auth = String(headers.authorization || "");
  return Boolean(secret) && auth === `Bearer ${secret}`;
}

/**
 * Grok/xAI: só sessão same-origin ou ingest com Bearer.
 * @param {{ site?: string | null, authorization?: string | null, userId?: string | null }} headers
 * @param {{ cronSecret?: string, userId?: string }} [env]
 */
export function spendKeyAllowed(headers, env = {}) {
  return writeAllowed("app", headers, env) || writeAllowed("ingest", headers, env);
}

/**
 * @param {WriteKind} kind
 * @param {{ cronSecret?: string }} [env]
 */
export function writeDenialStatus(kind, env = {}) {
  if (kind === "ingest") return 401;
  return 403;
}
