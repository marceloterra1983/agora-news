import { youtubePostId } from "./rss-id.mjs";
import { clipAtWord } from "./summary-core.mjs";
import { applyStoredTranslation, pickStoredPt } from "./translate-pt.mjs";
import { packMediaLabel } from "./story-media-meta.mjs";
import { decodeRssBody, parseFeedXml } from "./rss-parse.mjs";
import { extractChannelVideosFromHtml } from "./youtube-core.mjs";

/**
 * Resolve itens de um canal: tenta feed Atom primeiro; se der 404/500/vazio, usa fallback da página do canal.
 * @param {{ url: string, channelId?: string }} channel
 * @param {{ fetchImpl?: typeof fetch, maxItemsPerChannel?: number, headers?: Record<string, string> }} [opts]
 * @returns {Promise<Array<{ videoId?: string, guid?: string, link?: string, title?: string, summary?: string, publishedAt?: string, imageUrl?: string }>>}
 */
export async function resolveYouTubeChannelItems(channel, opts = {}) {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const limit = opts.maxItemsPerChannel ?? 1;

  let parsed = [];
  try {
    const res = await fetchImpl(channel.url, {
      headers: { "User-Agent": "AgoraNews/1.0", ...(opts.headers || {}) },
      signal: AbortSignal.timeout(12_000),
    });

    if (res.status === 200) {
      const xml = decodeRssBody(
        await res.arrayBuffer(),
        res.headers.get("content-type") || "",
      );
      parsed = parseFeedXml(xml, channel.url).sort(
        (a, b) => Date.parse(b.publishedAt || "") - Date.parse(a.publishedAt || ""),
      );
    }
  } catch {
    /* fallback abaixo */
  }

  if (!parsed.length && channel.channelId) {
    try {
      const pageUrl = `https://www.youtube.com/channel/${channel.channelId}/videos`;
      const pageRes = await fetchImpl(pageUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        },
        signal: AbortSignal.timeout(12_000),
      });
      if (pageRes.ok) {
        const html = await pageRes.text();
        parsed = extractChannelVideosFromHtml(html);
      }
    } catch {
      /* se fallback falhar, parsed fica vazio */
    }
  }

  return parsed.slice(0, limit);
}

/**
 * @param {{ account: string, section?: string }} channel
 * @param {Array<{ videoId?: string, guid?: string, link?: string, title?: string, summary?: string, publishedAt?: string, imageUrl?: string }>} items
 * @param {Set<string>} known
 * @param {string} batch
 * @param {Record<string, { title: string, summary: string }>} [translated]
 */
export function youtubePostsFromItems(channel, items, known, batch, translated = {}) {
  const rows = [];
  const account = channel.account;
  for (const item of items) {
    const postId = youtubePostId(item.videoId || item.guid || item.link);
    if (known.has(postId)) continue;
    const original = item.summary || item.title || "";
    const title = pickStoredPt(item.title || "", translated[postId]?.title);
    const summary = pickStoredPt(original, translated[postId]?.summary);
    const stored = applyStoredTranslation(original, summary || title);
    const videoId = item.videoId || "";
    const thumb = item.imageUrl || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "");
    const mediaMeta = {
      assets: [
        {
          type: "youtube",
          url: item.link,
          poster: thumb,
          videoId,
        },
      ],
    };
    rows.push({
      post_id: postId,
      account,
      posted_at: item.publishedAt || new Date().toISOString(),
      content: original,
      translation_pt: stored.translation_pt,
      summary_pt: clipAtWord(title || stored.summary_pt, 180),
      post_url: item.link,
      media_label: packMediaLabel("Vídeo", mediaMeta),
      image_url: thumb,
      category: String(channel.section || "ai"),
      batch_name: batch,
      source: "youtube",
    });
  }
  return rows;
}
