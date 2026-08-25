import { createHash } from "node:crypto";
import { canonicalUrl } from "./story-cluster.mjs";

export const RSS_ACCOUNT_RE = /^r_[a-f0-9]{12}$/i;

export function sha256Hex(value) {
  return createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

export function rssAccountId(feedUrl) {
  const canon = canonicalUrl(feedUrl) || String(feedUrl || "").trim();
  return `r_${sha256Hex(canon).slice(0, 12)}`;
}

export function rssPostId(guidOrLink) {
  return `rss_${sha256Hex(guidOrLink).slice(0, 24)}`;
}

export function isRssAccount(handle) {
  return RSS_ACCOUNT_RE.test(String(handle || "").replace(/^@+/, "").trim());
}
