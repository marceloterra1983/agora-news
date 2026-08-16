/**
 * Extras/watch só entram na seção em que foram adicionados.
 * Sem seção gravada (legado) não vazam para IA/Tech/Brasil.
 */

/** @param {unknown} raw */
export function parseWatchSection(raw) {
  if (!raw || typeof raw !== "object") return "";
  const row = /** @type {Record<string, unknown>} */ (raw);
  const batch = String(row.batch_name || "");
  const fromBatch = batch.match(/^x-watch:(.+)$/);
  if (fromBatch?.[1] && fromBatch[1] !== "x-watch") return fromBatch[1];
  const src = String(row.source || "").trim();
  if (src && src !== "x-watch") return src;
  return "";
}

/**
 * @param {Array<{ section?: string }>} extras
 * @param {string} section
 */
export function extrasForSection(extras, section) {
  const slug = String(section || "");
  if (!slug || !Array.isArray(extras)) return [];
  return extras.filter((e) => String(e?.section || "") === slug);
}
