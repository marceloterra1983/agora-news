/** RSS 2.0 + Atom. Sem dependência. HTML de content:encoded é ignorado. */

function bytesOf(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  return new Uint8Array(0);
}

function charsetFromContentType(value) {
  const match = String(value || "").match(/charset\s*=\s*["']?([^"';\s]+)/i);
  return match?.[1] || "";
}

function charsetFromXmlDecl(bytes) {
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 180));
  const match = head.match(/encoding\s*=\s*["']\s*([^"']+)\s*["']/i);
  return match?.[1] || "";
}

function normalizeCharset(label) {
  const key = String(label || "")
    .trim()
    .toLowerCase()
    .replace(/[_ ]/g, "-");
  if (!key) return "";
  if (key === "utf-8" || key === "utf8" || key === "unicode-1-1-utf-8") return "utf-8";
  if (
    key === "iso-8859-1" ||
    key === "iso8859-1" ||
    key === "latin1" ||
    key === "latin-1" ||
    key === "windows-1252" ||
    key === "cp1252" ||
    key === "csisolatin1"
  ) {
    return "windows-1252";
  }
  return key;
}

export function textHasReplacement(value) {
  return String(value || "").includes("\uFFFD");
}

/** UTF-8 válido ganha; senão charset do header/XML ou Windows-1252 (UOL/Folha). */
export function decodeRssBody(input, contentType = "") {
  const bytes = bytesOf(input);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    const hinted =
      normalizeCharset(charsetFromContentType(contentType)) ||
      normalizeCharset(charsetFromXmlDecl(bytes)) ||
      "windows-1252";
    const label = hinted === "utf-8" ? "windows-1252" : hinted;
    try {
      return new TextDecoder(label).decode(bytes);
    } catch {
      return new TextDecoder("windows-1252").decode(bytes);
    }
  }
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function stripTags(value) {
  return decodeEntities(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inner(block, name) {
  const match = String(block || "").match(
    new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"),
  );
  return match ? match[1].trim() : "";
}

function atomLink(entry) {
  const alternate = String(entry).match(
    /<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)/i,
  );
  if (alternate?.[1]) return alternate[1];
  const any = String(entry).match(/<link[^>]*href=["']([^"']+)/i);
  return any?.[1] || "";
}

const RSS_DAYS = {
  dom: "Sun",
  seg: "Mon",
  ter: "Tue",
  qua: "Wed",
  qui: "Thu",
  sex: "Fri",
  sab: "Sat",
};

const RSS_MONTHS = {
  jan: "Jan",
  fev: "Feb",
  mar: "Mar",
  abr: "Apr",
  mai: "May",
  jun: "Jun",
  jul: "Jul",
  ago: "Aug",
  set: "Sep",
  out: "Oct",
  nov: "Nov",
  dez: "Dec",
};

/** RFC-822 em PT-BR (UOL: Qui, 27 Ago) e inglês. Vazio se não der para parsear. */
export function parseRssDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const direct = Date.parse(raw);
  if (Number.isFinite(direct)) return new Date(direct).toISOString();
  const mapped = raw
    .replace(/S[áa]b\b/gi, "Sat")
    .replace(/\b(Dom|Seg|Ter|Qua|Qui|Sex)\b/gi, (word) => {
      return RSS_DAYS[word.slice(0, 3).toLowerCase()] || word;
    })
    .replace(/\b(Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez)\b/gi, (word) => {
      return RSS_MONTHS[word.slice(0, 3).toLowerCase()] || word;
    });
  const at = Date.parse(mapped);
  return Number.isFinite(at) ? new Date(at).toISOString() : "";
}

function publishedAt(block) {
  const raw =
    inner(block, "pubDate") ||
    inner(block, "published") ||
    inner(block, "updated") ||
    inner(block, "dc:date");
  return parseRssDate(stripTags(raw));
}

function toItem(block, kind) {
  const guid = stripTags(inner(block, "guid") || inner(block, "id"));
  const link = kind === "atom" ? atomLink(block) : stripTags(inner(block, "link")) || guid;
  const title = stripTags(inner(block, "title"));
  const summary = stripTags(
    inner(block, "description") || inner(block, "summary") || inner(block, "atom:summary"),
  ).slice(0, 400);
  if (!link && !guid) return null;
  if (!title && !summary) return null;
  return {
    guid: guid || link,
    title: title || summary.slice(0, 180),
    link: link || guid,
    publishedAt: publishedAt(block),
    summary,
  };
}

export function parseFeedXml(xml, feedUrl) {
  const text = String(xml || "");
  const items = [];
  const rssBlocks = text.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  for (const block of rssBlocks) {
    const item = toItem(block, "rss");
    if (item) items.push(item);
  }
  if (items.length) return items;
  const entries = text.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  for (const block of entries) {
    const item = toItem(block, "atom");
    if (item) items.push(item);
  }
  void feedUrl;
  return items;
}
