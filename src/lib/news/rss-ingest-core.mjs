import { rssAccountId, rssPostId } from "./rss-id.mjs";
import { clipAtWord } from "./summary-core.mjs";

export function ingestSurvives(xFailed, rssWritten) {
  return !xFailed || rssWritten > 0;
}

export function skipRssResponse(status) {
  return status === 304 || status < 200 || status >= 300;
}

export function rssPostsFromItems(feed, items, known, batch, translated = {}) {
  const rows = [];
  const account = feed.account || rssAccountId(feed.url);
  for (const item of items) {
    const postId = rssPostId(item.guid || item.link);
    if (known.has(postId)) continue;
    const title = translated[postId]?.title ?? item.title;
    const summary = translated[postId]?.summary ?? (item.summary || item.title);
    rows.push({
      post_id: postId,
      account,
      posted_at: item.publishedAt || new Date().toISOString(),
      content: item.summary || item.title,
      translation_pt: summary || title,
      summary_pt: clipAtWord(title || summary, 180),
      post_url: item.link,
      media_label: "Nenhuma",
      image_url: "",
      category: String(feed.section || ""),
      batch_name: batch,
      source: "rss",
    });
  }
  return rows;
}
