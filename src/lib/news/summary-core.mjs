/**
 * Regras puras de resumo de perfil — fonte única para TS e node:test.
 */

/** @param {string} text */
export function clipOneLine(text) {
  const clean = String(text || "")
    .replace(/\s+/g, " ")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/#\S+/g, "")
    .replace(/^["“”']+|["“”']+$/g, "")
    .trim();
  if (!clean) return "";
  const sentence = clean.split(/(?<=[.!?])\s+/)[0] ?? clean;
  if (sentence.length <= 160) return sentence;
  const cut = sentence.slice(0, 157);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > 80 ? cut.slice(0, sp) : cut).trimEnd()}…`;
}

/** Corta no espaço, não no meio da palavra. */
export function clipAtWord(text, max) {
  const s = String(text || "").trim();
  if (!s) return "";
  if (s.length <= max) return s;
  const cut = s.slice(0, Math.max(0, max - 1));
  const sp = cut.lastIndexOf(" ");
  const floor = Math.floor(max * 0.4);
  return `${(sp > floor ? cut.slice(0, sp) : cut).trimEnd()}…`;
}

/**
 * no/do/de sozinhos são inglês. Acento ou ≥2 partículas PT (sem no/do).
 * @param {string} text
 */
export function looksPortuguese(text) {
  const s = String(text || "");
  if (!s.trim()) return false;
  if (/[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(s)) return true;
  const en = (s.match(/\b(the|and|that|this|with|from|have|been|will|would|there|their|about|which|only|are|was|not|for)\b/gi) || [])
    .length;
  const ptStrong = (
    s.match(/\b(não|você|está|são|também|pelo|pela|então|porque|muito|isso|aqui|ainda)\b/gi) || []
  ).length;
  const ptWeak = (s.match(/\b(é|uma|para|com|na|dos|das)\b/gi) || []).length;
  if (en >= 2 && ptStrong === 0) return false;
  if (en > ptStrong + ptWeak) return false;
  return ptStrong >= 1 || ptWeak >= 2;
}

/** @param {string} name */
export function nameTokens(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !["the", "and", "for", "inc", "llc"].includes(w));
}

/**
 * @param {string} name
 * @param {string} handle
 * @param {string} title
 * @param {string} extract
 */
export function extractMatchesPerson(name, handle, title, extract) {
  const hay = `${title} ${extract}`.toLowerCase();
  const h = handle.toLowerCase();
  if (hay.includes(`@${h}`) || hay.includes(h)) return true;
  const toks = nameTokens(name);
  if (!toks.length) return false;
  const hits = toks.filter((t) => hay.includes(t));
  if (toks.length >= 2) return hits.length >= 2;
  return hits.length >= 1 && extract.length < 280;
}

/** @param {Record<string, unknown>} body */
export function extractLlmText(body) {
  const choices = body.choices;
  if (Array.isArray(choices)) {
    const msg = choices[0]?.message?.content;
    if (typeof msg === "string") return msg;
  }
  if (typeof body.output_text === "string") return body.output_text;
  const blocks = Array.isArray(body.content) ? body.content : [];
  if (blocks.some((part) => typeof part?.text === "string")) {
    return blocks.map((part) => (typeof part?.text === "string" ? part.text : "")).join("\n");
  }
  const output = Array.isArray(body.output) ? body.output : [];
  const chunks = [];
  for (const item of output) {
    const content = item?.content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (typeof part?.text === "string") chunks.push(part.text);
    }
  }
  return chunks.join("\n");
}

/**
 * @param {string} line
 * @param {string} name
 * @param {string} handle
 * @param {string} bio
 */
export function plausibleSummary(line, name, handle, bio) {
  if (!line) return false;
  const low = line.toLowerCase();
  if (
    low.includes("lex fridman") &&
    !handle.toLowerCase().includes("lex") &&
    !name.toLowerCase().includes("lex")
  ) {
    return false;
  }
  if (/fonte acompanhada no feed/i.test(line)) return false;
  const invented = ["prêmio nobel", "presidente dos estados", "rei de"];
  if (invented.some((w) => low.includes(w) && !`${bio} ${name}`.toLowerCase().includes(w))) {
    return false;
  }
  return true;
}
