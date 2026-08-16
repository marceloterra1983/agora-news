/** media_label guarda o rótulo; a 2ª linha é JSON de quote/vídeo para o SSR. */

/** @param {string} label @param {Record<string, unknown> | null | undefined} meta */
export function packMediaLabel(label, meta) {
  const name = String(label || "Nenhuma");
  if (!meta || typeof meta !== "object") return name;
  const has =
    meta.quoted ||
    meta.replyTo ||
    meta.card ||
    meta.xArticle ||
    (Array.isArray(meta.assets) && meta.assets.length);
  if (!has) return name;
  return `${name}\n${JSON.stringify(meta)}`;
}

/** @param {unknown} raw */
export function unpackMediaLabel(raw) {
  const s = String(raw || "");
  const nl = s.indexOf("\n");
  if (nl < 0) return { label: s, meta: null };
  try {
    const meta = JSON.parse(s.slice(nl + 1));
    if (!meta || typeof meta !== "object") return { label: s.slice(0, nl), meta: null };
    return { label: s.slice(0, nl) || "Nenhuma", meta };
  } catch {
    return { label: s, meta: null };
  }
}
