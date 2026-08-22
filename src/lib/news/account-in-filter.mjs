/** PostgREST `in.` é case-sensitive em text. O ingest grava a caixa do X (OpenAI). */
import { AI_PROFILES } from "./catalog-ai.mjs";
import { BRASIL_PROFILES } from "./catalog-brasil.mjs";
import { TECH_PROFILES } from "./catalog-tech.mjs";
import { avatarInFilter } from "./profile-store-core.mjs";

function norm(handle) {
  return String(handle || "")
    .replace(/^@+/, "")
    .trim()
    .toLowerCase();
}

const SEED_HANDLES = [...AI_PROFILES, ...TECH_PROFILES, ...BRASIL_PROFILES].map(
  (row) => String(row.handle || "").replace(/^@+/, "").trim(),
);

/**
 * Lista para `account=in.(...)`: minúsculas do recorte + caixa original do catálogo.
 * @param {unknown} accounts
 * @param {unknown} [extraHandles]
 */
export function accountInFilter(accounts, extraHandles = []) {
  const want = new Set(
    (Array.isArray(accounts) ? accounts : []).map(norm).filter(Boolean),
  );
  if (!want.size) return "";
  const raw = [...want];
  for (const handle of [...SEED_HANDLES, ...(Array.isArray(extraHandles) ? extraHandles : [])]) {
    const h = String(handle || "").replace(/^@+/, "").trim();
    if (h && want.has(norm(h))) raw.push(h);
  }
  return avatarInFilter(raw);
}

/**
 * Contas do recorte com a caixa do seed/extras — group filter incluso.
 * @param {{ handles?: string[], profiles?: Array<{ handle?: string }>, extras?: Array<{ handle?: string }> } | null | undefined} catalog
 * @param {unknown} requested
 */
export function accountsForQuery(catalog, requested) {
  const allowed = new Set(
    (Array.isArray(catalog?.handles) ? catalog.handles : []).map(norm).filter(Boolean),
  );
  const want = Array.isArray(requested) && requested.length
    ? requested.map(norm).filter((h) => allowed.has(h))
    : [...allowed];
  const known = [
    ...(Array.isArray(catalog?.profiles) ? catalog.profiles : []),
    ...(Array.isArray(catalog?.extras) ? catalog.extras : []),
  ].map((row) => String(row?.handle || "").replace(/^@+/, "").trim());
  return [...want, ...known.filter((h) => want.includes(norm(h)))];
}
