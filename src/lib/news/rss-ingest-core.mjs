import { rssAccountId, rssPostId } from "./rss-id.mjs";
import { clipAtWord } from "./summary-core.mjs";
import { applyStoredTranslation, pickStoredPt } from "./translate-pt.mjs";

export function ingestSurvives(xFailed, rssWritten) {
  return !xFailed || rssWritten > 0;
}

export function skipRssResponse(status) {
  return status === 304 || status < 200 || status >= 300;
}

/** Não pular item envenenado com �; novos só entram se estiverem na janela latest. */
export function rssIdsToSkip(ids, opts) {
  const known = opts?.known || new Set();
  const poisoned = opts?.poisoned || new Set();
  const latest = opts?.latest || new Set();
  const skip = new Set();
  for (const id of ids || []) {
    if (poisoned.has(id)) continue;
    if (!latest.has(id) || known.has(id)) skip.add(id);
  }
  return skip;
}

export function rssPostsFromItems(feed, items, known, batch, translated = {}) {
  const rows = [];
  const account = feed.account || rssAccountId(feed.url);
  for (const item of items) {
    const postId = rssPostId(item.guid || item.link);
    if (known.has(postId)) continue;
    const original = item.summary || item.title;
    const title = pickStoredPt(item.title, translated[postId]?.title);
    const summary = pickStoredPt(original, translated[postId]?.summary);
    const stored = applyStoredTranslation(original, summary || title);
    rows.push({
      post_id: postId,
      account,
      posted_at: item.publishedAt || new Date().toISOString(),
      content: original,
      translation_pt: stored.translation_pt,
      summary_pt: clipAtWord(title || stored.summary_pt, 180),
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
