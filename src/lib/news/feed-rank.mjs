/** @typedef {"recente" | "seguindo" | "importante"} FeedOrdem */

export const FEED_ORDENS = ["recente", "seguindo", "importante"];

export function normalizeOrdem(value) {
  const key = String(value || "").trim();
  return FEED_ORDENS.includes(key) ? key : "recente";
}

function hoursAgo(iso, now) {
  const at = Date.parse(String(iso || ""));
  if (!Number.isFinite(at)) return 99;
  return Math.max(0, (now - at) / 3_600_000);
}

/**
 * @param {Array<Record<string, unknown>>} stories
 * @param {string} ordem
 * @param {{ starred?: string[], watched?: string[], read?: Set<string> | string[], hasBaseline?: boolean, now?: number }} [signals]
 */
export function rankStories(stories, ordem, signals = {}) {
  const list = [...(Array.isArray(stories) ? stories : [])];
  const mode = normalizeOrdem(ordem);
  const starred = new Set((signals.starred || []).map((h) => String(h).toLowerCase()));
  const watched = new Set((signals.watched || []).map((h) => String(h).toLowerCase()));
  const read = signals.read instanceof Set ? signals.read : new Set(signals.read || []);
  const now = signals.now ?? Date.now();
  const followed = (story) => {
    const source = String(story.source || "").toLowerCase();
    return starred.has(source) || watched.has(source);
  };
  if (mode === "recente") {
    return list.sort(
      (a, b) =>
        Date.parse(String(b.publishedAt || "")) - Date.parse(String(a.publishedAt || "")) ||
        String(a.id).localeCompare(String(b.id)),
    );
  }
  if (mode === "seguindo") {
    return list.sort((a, b) => {
      const fa = followed(a) ? 0 : 1;
      const fb = followed(b) ? 0 : 1;
      if (fa !== fb) return fa - fb;
      return (
        Date.parse(String(b.publishedAt || "")) - Date.parse(String(a.publishedAt || "")) ||
        String(a.id).localeCompare(String(b.id))
      );
    });
  }
  return list.sort((a, b) => {
    const score = (story) => {
      const recency = 1 / (1 + hoursAgo(story.publishedAt, now) / 6);
      const also = Array.isArray(story.alsoFrom) ? story.alsoFrom.length : 0;
      const follow = followed(story) ? 3 : 0;
      const image = story.image ? 1 : 0;
      const readPenalty =
        signals.hasBaseline && read.has(String(story.id)) ? 2 : 0;
      return recency + 2 * also + follow + image - readPenalty;
    };
    return score(b) - score(a) || Date.parse(String(b.publishedAt || "")) - Date.parse(String(a.publishedAt || "")) || String(a.id).localeCompare(String(b.id));
  });
}
