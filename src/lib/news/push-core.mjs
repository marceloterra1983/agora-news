/**
 * Regras puras de persistência de push — fonte única para TS e node:test.
 */

/** @param {boolean} tableOk @param {boolean} kvOk */
export function pushPersisted(tableOk, kvOk) {
  return Boolean(tableOk || kvOk);
}

/** @param {number} status @returns {"ok" | "absent" | "error"} */
export function classifyPushTableHttp(status) {
  const code = Number(status) || 0;
  if (code === 404 || code === 400) return "absent";
  if (code >= 200 && code < 300) return "ok";
  return "error";
}

/**
 * @template T
 * @param {"ok" | "absent" | "error"} kind
 * @param {T[]} tableRows
 * @param {T[]} extras
 */
export function pickPushList(kind, tableRows, extras) {
  if (kind === "ok") return tableRows;
  return extras;
}
