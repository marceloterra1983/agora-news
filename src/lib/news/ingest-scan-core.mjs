/** Prefixo rotativo do catálogo — a cauda entra no próximo cron. */

/** @param {string[]} catalog @param {number} cursor */
export function rotateFrom(catalog, cursor) {
  const list = Array.isArray(catalog) ? catalog : [];
  const start = list.length ? ((Number(cursor) % list.length) + list.length) % list.length : 0;
  return { start, rotated: list.length ? [...list.slice(start), ...list.slice(0, start)] : [] };
}
