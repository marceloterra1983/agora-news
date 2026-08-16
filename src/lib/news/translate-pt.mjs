import { looksPortuguese } from "./summary-core.mjs";
import { chunkText, parseGtx } from "./story-pt.mjs";

/**
 * Traduz o texto inteiro (gtx por fatia). Não corta em 280.
 * @param {string} text
 * @param {{ timeout?: number, chunk?: number }} [opts]
 */
export async function translateToPt(text, opts = {}) {
  const src = String(text || "").trim();
  if (!src) return "";
  if (looksPortuguese(src)) return src;
  const timeout = opts.timeout ?? 8_000;
  const out = [];
  for (const chunk of chunkText(src, opts.chunk ?? 1500)) {
    try {
      const g = await fetch(
        `https://translate.googleapis.com/translate_a/single?${new URLSearchParams({
          client: "gtx",
          sl: "auto",
          tl: "pt",
          dt: "t",
          q: chunk,
        })}`,
        { signal: AbortSignal.timeout(timeout) },
      );
      if (!g.ok) {
        out.push(chunk);
        continue;
      }
      out.push(parseGtx(await g.json()) || chunk);
    } catch {
      out.push(chunk);
    }
  }
  return out.join("").trim();
}
