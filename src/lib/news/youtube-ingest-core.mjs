import { youtubePostId } from "./rss-id.mjs";
import { clipAtWord } from "./summary-core.mjs";
import { applyStoredTranslation, pickStoredPt } from "./translate-pt.mjs";
import { packMediaLabel } from "./story-media-meta.mjs";

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
