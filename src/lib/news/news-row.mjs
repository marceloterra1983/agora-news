/**
 * O que pode virar matéria no feed. last_/x-last são last-post, não notícia.
 * @param {{ post_id?: string, category?: string | null, batch_name?: string | null, account?: string | null } | null | undefined} p
 */
export function isNewsRow(p) {
  if (!p?.post_id) return false;
  if (
    p.category === "profile" ||
    p.category === "watch" ||
    p.category === "lock" ||
    p.category === "x-last"
  )
    return false;
  if (p.category === "cache" || p.category === "push" || p.category === "prefs") return false;
  if (p.batch_name === "x-profile" || p.batch_name === "x-watch" || p.batch_name === "cache") {
    return false;
  }
  if (/^(prfl_|watch_|lock_|kv_|push_|last_)/i.test(p.post_id)) return false;
  if (p.account === "cache") return false;
  return true;
}
