import { createHash } from "node:crypto";
import { canonicalUrl } from "./story-cluster.mjs";

export const RSS_ACCOUNT_RE = /^r_[a-f0-9]{12}$/i;
export const YOUTUBE_ACCOUNT_RE = /^y_[a-f0-9]{12}$/i;
export const YOUTUBE_POST_RE = /^yt_[a-zA-Z0-9_-]{11}$/i;

export function sha256Hex(value) {
  return createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

export function rssAccountId(feedUrl) {
  const canon = canonicalUrl(feedUrl) || String(feedUrl || "").trim();
  return `r_${sha256Hex(canon).slice(0, 12)}`;
}

export function youtubeAccountId(channelIdOrFeedUrl) {
  const canon = canonicalUrl(channelIdOrFeedUrl) || String(channelIdOrFeedUrl || "").trim();
  return `y_${sha256Hex(canon).slice(0, 12)}`;
}

export function rssPostId(guidOrLink) {
  return `rss_${sha256Hex(guidOrLink).slice(0, 24)}`;
}

export function youtubePostId(videoId) {
  const clean = String(videoId || "").trim().replace(/^yt:video:/i, "");
  return `yt_${clean}`;
}

export function isRssAccount(handle) {
  return RSS_ACCOUNT_RE.test(String(handle || "").replace(/^@+/, "").trim());
}

export function isYouTubeAccount(handle) {
  return YOUTUBE_ACCOUNT_RE.test(String(handle || "").replace(/^@+/, "").trim());
}

export function isYouTubePostId(id) {
  return YOUTUBE_POST_RE.test(String(id || "").trim());
}
