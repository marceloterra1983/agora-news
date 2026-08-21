/**
 * SSL do node-pg. Não passe `connectionString` no Pool: o pg faz
 * `Object.assign(config, parse(url))` e o `uselibpqcompat=true` do
 * dashboard Supabase vira `ssl.rejectUnauthorized = false`.
 */
import { SUPABASE_PROD_CA_2021 } from "./supabase-ca-2021.mjs";

function isLoopbackHost(host) {
  const h = String(host || "")
    .replace(/^\[|\]$/g, "")
    .toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

function isSupabaseHost(host) {
  const h = String(host || "").toLowerCase();
  return h.endsWith(".supabase.com") || h.endsWith(".supabase.co");
}

/** @param {string} connectionString */
export function parseDatabaseUrl(connectionString) {
  const raw = String(connectionString || "").trim();
  if (!raw) throw new Error("missing_database_url");
  let url;
  try {
    url = new URL(raw.replace(/^postgres(ql)?:/i, "http:"));
  } catch {
    throw new Error("invalid_database_url");
  }
  const database = decodeURIComponent(
    url.pathname.replace(/^\/+/, "").split("/")[0] || "",
  );
  return {
    host: decodeURIComponent(url.hostname),
    port: url.port ? Number(url.port) : undefined,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
  };
}

function sslForHost(host) {
  if (isLoopbackHost(host)) return false;
  if (isSupabaseHost(host)) {
    return { rejectUnauthorized: true, ca: SUPABASE_PROD_CA_2021 };
  }
  return { rejectUnauthorized: true };
}

/**
 * @param {string} connectionString
 * @param {Record<string, unknown>} [extra]
 */
export function postgresPoolConfig(connectionString, extra = {}) {
  const parts = parseDatabaseUrl(connectionString);
  return {
    host: parts.host,
    port: parts.port,
    user: parts.user,
    password: parts.password,
    database: parts.database,
    ...extra,
    ssl: sslForHost(parts.host),
  };
}
