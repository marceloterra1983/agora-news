import { looksPortuguese } from "./summary-core.mjs";

/** Ingest histórico cortava em 280. Inglês longo + PT curto = retraduzir. */
export function isTruncatedPt(original, body) {
  const orig = String(original || "").trim();
  const pt = String(body || "").trim();
  if (!orig || !pt) return false;
  if (orig.length > 400 && pt.length <= 280) return true;
  if (!looksPortuguese(orig) && pt.length < orig.length * 0.75) return true;
  return false;
}

/** Retraduz inglês quando o PT está cortado ou não é português de verdade. */
export function needsFullTranslation(original, body) {
  const orig = String(original || "").trim();
  const pt = String(body || "").trim();
  if (!orig) return false;
  if (!pt) return !looksPortuguese(orig);
  if (isTruncatedPt(orig, pt)) return true;
  if (!looksPortuguese(pt) && !looksPortuguese(orig)) return true;
  return false;
}

/** Título editorial (síntese) ≠ o corpo cortado que o feed usa como title. */
export function isDistinctTitle(title, body) {
  const t = String(title || "")
    .replace(/[.…]+$/u, "")
    .trim();
  const b = String(body || "").trim();
  if (!t || !b) return Boolean(t);
  if (t === b) return false;
  return !b.startsWith(t.slice(0, Math.min(48, t.length)));
}

export function chunkText(text, max = 1500) {
  const src = String(text || "");
  if (src.length <= max) return src ? [src] : [];
  const out = [];
  let rest = src;
  const floor = Math.floor(max * 0.4);
  while (rest.length > max) {
    let cut = rest.lastIndexOf("\n", max);
    if (cut < floor) cut = rest.lastIndexOf(". ", max);
    if (cut < floor) cut = max;
    else if (rest.startsWith(". ", cut)) cut += 2;
    else cut += 1;
    out.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest) out.push(rest);
  return out;
}

export function parseGtx(data) {
  const parts = Array.isArray(data) && Array.isArray(data[0]) ? data[0] : [];
  return parts
    .map((p) => (Array.isArray(p) && typeof p[0] === "string" ? p[0] : ""))
    .join("")
    .trim();
}
