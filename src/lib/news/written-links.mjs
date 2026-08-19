/** URLs escritas no corpo do post — some o texto, sobra o href. */

import { safeHttpHref } from "./last-post-core.mjs";

const WRITTEN_LINK = "(?:https?:\\/\\/|www\\.)[^\\s<>\"']+";

function peel(raw) {
  return String(raw || "").replace(/[),.;:!?…]+$/g, "");
}

export function normalizeWrittenHref(raw) {
  let href = peel(raw).trim();
  if (!href) return "";
  if (/^www\./i.test(href)) href = `https://${href}`;
  return safeHttpHref(href, { allowPath: false });
}

export function extractWrittenLinks(text) {
  const seen = new Set();
  const out = [];
  const matches = String(text || "").matchAll(new RegExp(WRITTEN_LINK, "gi"));
  for (const match of matches) {
    const href = normalizeWrittenHref(match[0]);
    if (!href || seen.has(href)) continue;
    seen.add(href);
    out.push(href);
  }
  return out;
}

export function publishedLinksFrom(text, skipHref = "") {
  const skips = new Set(
    (Array.isArray(skipHref) ? skipHref : [skipHref]).map(normalizeWrittenHref).filter(Boolean),
  );
  return extractWrittenLinks(text).filter((href) => !skips.has(href));
}

export function stripWrittenLinks(text) {
  return String(text || "")
    .replace(/\[([^\]]+)\]\(\s*(?:https?:\/\/|www\.)[^)]+\)/gi, "$1")
    .replace(new RegExp(WRITTEN_LINK, "gi"), "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+([,.!?])/g, "$1")
    .trim();
}

export function writtenLinkHost(href) {
  try {
    return new URL(href).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}
