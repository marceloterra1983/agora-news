export const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;
export const CHANNEL_ID_RE = /^UC[a-zA-Z0-9_-]{22}$/;
/** Vídeo mais velho que isto não entra no feed nem na ingestão — evita cursor de +12h em 2012. */
export const YOUTUBE_MAX_AGE_MS = 30 * 24 * 3_600_000;

/**
 * @param {unknown} iso
 * @param {number} [now]
 */
export function youtubePostedAtIsFresh(iso, now = Date.now()) {
  const t = Date.parse(String(iso || ""));
  if (!Number.isFinite(t)) return false;
  if (t > now + 3_600_000) return false;
  return now - t <= YOUTUBE_MAX_AGE_MS;
}

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

/**
 * Extrai vídeos recentes a partir da página HTML do canal (fallback para 404/500 do feed Atom)
 * @param {string} html
 * @returns {Array<{ videoId: string, guid: string, link: string, title: string, summary: string, publishedAt: string, imageUrl: string }>}
 */
export function extractChannelVideosFromHtml(html) {
  const text = String(html || "");
  const match = text.match(/ytInitialData\s*=\s*({[\s\S]*?});\s*<\/script>/);
  if (!match) return [];

  let data;
  try {
    data = JSON.parse(match[1]);
  } catch {
    return [];
  }

  const items = [];
  const seen = new Set();

  function search(obj) {
    if (!obj || typeof obj !== "object") return;
    if (obj.lockupViewModel) {
      const l = obj.lockupViewModel;
      const videoId = l.contentId || l.rendererContext?.commandContext?.onTap?.innertubeCommand?.watchEndpoint?.videoId;
      const title = l.metadata?.lockupMetadataViewModel?.title?.content;
      if (videoId && title && !seen.has(videoId)) {
        seen.add(videoId);
        items.push({
          videoId,
          guid: `yt:video:${videoId}`,
          link: `https://www.youtube.com/watch?v=${videoId}`,
          title: String(title).trim(),
          summary: "",
          publishedAt: "",
          imageUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        });
        return;
      }
    }
    if (obj.videoRenderer) {
      const v = obj.videoRenderer;
      const videoId = v.videoId;
      const title = v.title?.runs?.[0]?.text || v.title?.simpleText;
      if (videoId && title && !seen.has(videoId)) {
        seen.add(videoId);
        items.push({
          videoId,
          guid: `yt:video:${videoId}`,
          link: `https://www.youtube.com/watch?v=${videoId}`,
          title: String(title).trim(),
          summary: v.descriptionSnippet?.runs?.[0]?.text || "",
          publishedAt: "",
          imageUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        });
        return;
      }
    }
    for (const k of Object.keys(obj)) {
      search(obj[k]);
    }
  }

  search(data);
  return items;
}

/**
 * Busca a data de publicação exata a partir da página do vídeo no YouTube.
 * @param {string} videoId
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<string>} Data no formato ISO (ex: "2026-08-28T20:51:46.000Z") ou vazio se não encontrar
 */
export async function fetchVideoPublishedAt(videoId, fetchImpl = fetch) {
  const cleanId = extractYouTubeId(videoId);
  if (!cleanId) return "";
  try {
    const res = await fetchImpl(`https://www.youtube.com/watch?v=${cleanId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return "";
    const html = await res.text();
    const match =
      html.match(/<meta\s+itemprop=["']datePublished["']\s+content=["']([^"']+)["']/i)?.[1] ||
      html.match(/<meta\s+itemprop=["']uploadDate["']\s+content=["']([^"']+)["']/i)?.[1] ||
      html.match(/"publishDate":\s*"([^"]+)"/)?.[1] ||
      html.match(/"uploadDate":\s*"([^"]+)"/)?.[1];
    if (!match) return "";
    const parsed = Date.parse(match);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
  } catch {
    return "";
  }
}
