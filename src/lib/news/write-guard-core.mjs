/**
 * Regras de escrita da API Agora (fonte canônica).
 *
 * app: só fetch same-origin (PWA). Bloqueia curl e CSRF cross-site.
 * ingest: só Bearer ${CRON_SECRET}. Sem secret, ninguém passa (fail-closed).
 * ops: só same-origin (ex.: /api/cache).
 */

import { timingSafeEqual } from "node:crypto";

/** @typedef {"app" | "ingest" | "ops"} WriteKind */

/**
 * Comparação em tempo constante para evitar side-channel timing attacks.
 * @param {string | null | undefined} authorization
 * @param {string} secret
 */
export function safeBearerMatch(authorization, secret) {
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`, "utf8");
  const got = Buffer.from(String(authorization || ""), "utf8");
  if (expected.length !== got.length) {
    timingSafeEqual(expected, expected);
    return false;
  }
  return timingSafeEqual(got, expected);
}

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
  return Boolean(secret) && safeBearerMatch(headers.authorization, secret);
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
 */
export function writeDenialStatus(kind) {
  if (kind === "ingest") return 401;
  return 403;
}
