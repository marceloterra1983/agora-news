export const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;
export const CHANNEL_ID_RE = /^UC[a-zA-Z0-9_-]{22}$/;

/**
 * @param {string} urlOrId
 * @returns {string}
 */
export function extractYouTubeId(urlOrId) {
  const input = String(urlOrId || "").trim();
  if (YOUTUBE_ID_RE.test(input)) return input;
  const match = input.match(/(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|\/shorts\/)([a-zA-Z0-9_-]{11})/i);
  return match?.[1] || "";
}

/**
 * @param {string} channelId
 * @returns {string}
 */
export function youtubeFeedUrl(channelId) {
  const clean = String(channelId || "").trim();
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${clean}`;
}

/**
 * @param {string} html
 * @returns {string}
 */
export function extractChannelIdFromHtml(html) {
  const text = String(html || "");
  const matchLink = text.match(/<link[^>]*rel=["']alternate["'][^>]*href=["'][^"']*channel_id=(UC[a-zA-Z0-9_-]{22})/i);
  if (matchLink?.[1]) return matchLink[1];

  const matchCanon = text.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']https?:\/\/(?:www\.)?youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})/i);
  if (matchCanon?.[1]) return matchCanon[1];

  const matchItemprop = text.match(/<meta[^>]*itemprop=["']channelId["'][^>]*content=["'](UC[a-zA-Z0-9_-]{22})["']/i);
  if (matchItemprop?.[1]) return matchItemprop[1];

  const matchJson = text.match(/"(?:externalId|channelId)":"(UC[a-zA-Z0-9_-]{22})"/);
  if (matchJson?.[1]) return matchJson[1];

  return "";
}
