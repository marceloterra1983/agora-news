/** RSS 2.0 + Atom. Sem dependência. HTML de content:encoded é ignorado. */

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

function publishedAt(block) {
  const raw =
    inner(block, "pubDate") ||
    inner(block, "published") ||
    inner(block, "updated") ||
    inner(block, "dc:date");
  const at = Date.parse(stripTags(raw));
  return Number.isFinite(at) ? new Date(at).toISOString() : "";
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
