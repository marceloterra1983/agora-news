import { clipAtWord, looksPortuguese } from "./summary-core.mjs";
import { chunkText, needsFullTranslation, parseGtx } from "./story-pt.mjs";

const GTX_URL = "https://translate.googleapis.com/translate_a/single";
const CHROME_URL = "https://clients5.google.com/translate_a/t";
const MYMEMORY_URL = "https://api.mymemory.translated.net/get";

const skipUntil = { gtx: 0, mymemory: 0 };

export function resetTranslateSkip() {
  skipUntil.gtx = 0;
  skipUntil.mymemory = 0;
}

/** Só grava PT de verdade. Inglês copiado do original não entra em translation_pt. */
export function pickStoredPt(original, candidate) {
  const pt = String(candidate || "").trim();
  if (!pt) return "";
  if (!looksPortuguese(pt)) return "";
  return pt;
}

export function applyStoredTranslation(original, candidate) {
  const src = String(original || "").trim();
  const translation_pt = pickStoredPt(src, candidate);
  return { translation_pt, summary_pt: clipAtWord(translation_pt || src, 180) };
}

export async function hydrateStoryBody(original, body, translate = translateToPt) {
  let next = String(body || "").trim();
  if (needsFullTranslation(original, next)) {
    const pt = await translate(original);
    if (pt) next = pt;
  }
  return next || String(original || "").trim();
}

/** `[["texto PT","en"]]` — resposta do client dict-chrome-ex. */
export function parseChrome(data) {
  if (!Array.isArray(data) || !data.length) return "";
  if (Array.isArray(data[0]) && typeof data[0][0] === "string") {
    return data
      .map((part) => (Array.isArray(part) && typeof part[0] === "string" ? part[0] : ""))
      .join("")
      .trim();
  }
  if (typeof data[0] === "string") return data.join("").trim();
  return parseGtx(data);
}

function libreUrl(opts) {
  const base = String(opts.libreUrl || (typeof process !== "undefined" && process.env?.LIBRETRANSLATE_URL) || "").trim();
  return base ? `${base.replace(/\/$/, "")}/translate` : "";
}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function skipFor(key, ms) {
  skipUntil[key] = Date.now() + ms;
}

async function translateChrome(chunk, opts, fetchImpl) {
  const url = `${CHROME_URL}?${new URLSearchParams({
    client: "dict-chrome-ex",
    sl: "auto",
    tl: "pt",
    q: chunk,
  })}`;
  const res = await fetchImpl(url, { signal: AbortSignal.timeout(opts.timeout ?? 8_000) });
  if (!res.ok) return "";
  return parseChrome(await readJson(res));
}

async function translateGtx(chunk, opts, fetchImpl) {
  if (skipUntil.gtx > Date.now()) return "";
  const url = `${GTX_URL}?${new URLSearchParams({ client: "gtx", sl: "auto", tl: "pt", dt: "t", q: chunk })}`;
  const res = await fetchImpl(url, { signal: AbortSignal.timeout(opts.timeout ?? 8_000) });
  if (res.status === 429) {
    skipFor("gtx", 15 * 60_000);
    return "";
  }
  if (!res.ok) return "";
  return parseGtx(await readJson(res));
}

async function translateLibre(chunk, opts, fetchImpl) {
  const url = libreUrl(opts);
  if (!url) return "";
  const res = await fetchImpl(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ q: chunk, source: "auto", target: "pt", format: "text" }),
    signal: AbortSignal.timeout(Math.min(opts.timeout ?? 8_000, 3_000)),
  });
  if (!res.ok) return "";
  const data = await readJson(res);
  return typeof data?.translatedText === "string" ? data.translatedText.trim() : "";
}

async function translateMyMemory(chunk, opts, fetchImpl) {
  if (skipUntil.mymemory > Date.now()) return "";
  const email = String((typeof process !== "undefined" && process.env?.MYMEMORY_EMAIL) || "").trim();
  const params = new URLSearchParams({ q: chunk.slice(0, 450), langpair: "en|pt" });
  if (email) params.set("de", email);
  const res = await fetchImpl(`${MYMEMORY_URL}?${params}`, {
    signal: AbortSignal.timeout(opts.timeout ?? 8_000),
  });
  if (res.status === 429) {
    skipFor("mymemory", 60 * 60_000);
    return "";
  }
  if (!res.ok) return "";
  const data = await readJson(res);
  const text = data?.responseData?.translatedText;
  if (typeof text !== "string" || /^MYMEMORY WARNING/i.test(text)) {
    if (typeof text === "string" && /MYMEMORY WARNING/i.test(text)) skipFor("mymemory", 60 * 60_000);
    return "";
  }
  return text.trim();
}

async function translateChunk(chunk, opts, fetchImpl) {
  const providers = [translateChrome, translateGtx, translateLibre, translateMyMemory];
  for (const provider of providers) {
    try {
      const out = await provider(chunk, opts, fetchImpl);
      if (pickStoredPt(chunk, out)) return out;
    } catch {
      /* próximo provedor */
    }
  }
  return "";
}

/**
 * Traduz o texto inteiro. Não devolve inglês quando o tradutor falha.
 * @param {string} text
 * @param {{ timeout?: number, chunk?: number, onFail?: () => void, libreUrl?: string, fetch?: typeof fetch }} [opts]
 */
export async function translateToPt(text, opts = {}) {
  const src = String(text || "").trim();
  if (!src) return "";
  if (looksPortuguese(src)) return src;
  const fetchImpl = opts.fetch ?? fetch;
  const out = [];
  for (const chunk of chunkText(src, opts.chunk ?? 1500)) {
    const translated = await translateChunk(chunk, opts, fetchImpl);
    if (!translated) {
      opts.onFail?.();
      return "";
    }
    out.push(translated);
  }
  return out.join("").trim();
}
