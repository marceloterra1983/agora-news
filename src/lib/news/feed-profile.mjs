/** Resolve o card de Fontes a partir de um handle clicado no feed. */

export function feedHandle(raw) {
  return String(raw || "")
    .replace(/^@+/, "")
    .trim()
    .toLowerCase();
}

export function findFonteRow(rows, handle) {
  const key = feedHandle(handle);
  if (!key || !Array.isArray(rows)) return null;
  return rows.find((row) => feedHandle(row?.handle) === key) ?? null;
}

export function lastPostsFromStories(stories, handle) {
  const key = feedHandle(handle);
  if (!key || !Array.isArray(stories)) return [];
  const seen = new Set();
  const posts = [];
  for (const story of stories) {
    if (feedHandle(story?.source || story?.sourceLabel) !== key) continue;
    const id = String(story?.id || "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    posts.push({
      id,
      href: `/materia/${id}`,
      title: String(story.title || ""),
      publishedAt: String(story.publishedAt || ""),
    });
  }
  return posts;
}

export function fillMissingLastPosts(row, posts) {
  if (!row) return null;
  if (Array.isArray(row.lastPosts) && row.lastPosts.length) return row;
  if (!Array.isArray(posts) || !posts.length) return row;
  return { ...row, lastPosts: posts, lastPost: row.lastPost ?? posts[0] };
}

export function fallbackFonteRow({ handle, name, avatar, group } = {}) {
  const key = String(handle || "")
    .replace(/^@+/, "")
    .trim();
  return {
    handle: key,
    name: name || key,
    group: group || "novos",
    followers: 0,
    verified: false,
    avatar: avatar || null,
    bio: null,
    lastPost: null,
    lastPosts: [],
    inFeed: 0,
    articles: 0,
    longform: 0,
    likes: 0,
    engagement: 0,
    views: 0,
    er: 0,
  };
}

export function resolveFeedProfileRow({ handle, rows, stories, fallback }) {
  const found = findFonteRow(rows, handle) ?? fallback ?? null;
  return fillMissingLastPosts(found, lastPostsFromStories(stories, handle));
}
