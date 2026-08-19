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

const SHORTENER = /^(t\.co|bit\.ly|tinyurl\.com|ow\.ly|buff\.ly|trib\.al|dlvr\.it)$/i;

function linkKey(href) {
  try {
    const url = new URL(href);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    const path = url.pathname.replace(/\/+$/, "") || "/";
    return `${host}${path}`;
  } catch {
    return href;
  }
}

function isShortener(href) {
  try {
    return SHORTENER.test(new URL(href).hostname.replace(/^www\./i, ""));
  } catch {
    return false;
  }
}

function scorePublished(href) {
  let score = isShortener(href) ? 0 : 100;
  try {
    score += Math.min(new URL(href).pathname.length, 80);
  } catch {
    /* href already validated */
  }
  return score;
}

export function publishedLinksFrom(text, skipHref = "") {
  const skips = (Array.isArray(skipHref) ? skipHref : [skipHref])
    .map(normalizeWrittenHref)
    .filter(Boolean);
  const skipKeys = new Set(skips.map(linkKey));
  const byKey = new Map();
  for (const href of extractWrittenLinks(text)) {
    const key = linkKey(href);
    if (skipKeys.has(key)) continue;
    const prev = byKey.get(key);
    if (!prev || scorePublished(href) > scorePublished(prev)) byKey.set(key, href);
  }
  return [...byKey.values()].sort((a, b) => scorePublished(b) - scorePublished(a)).slice(0, 1);
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
