/**
 * Regras puras de perfil persistido — fonte única para TS e node:test.
 */
import { parseLastPost } from "./last-post-core.mjs";

/**
 * Foto original do X no círculo: troca o thumb (_normal/_bigger/_mini) por 400x400.
 * @param {unknown} url
 * @returns {string | null}
 */
export function displayAvatarUrl(url) {
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed.replace(/_(normal|bigger|mini)\./i, "_400x400.");
}

/**
 * @param {Array<{ source?: string, avatar?: string | null }>} stories
 * @param {Map<string, string | null> | Record<string, string | null>} avatars
 */
export function withAvatars(stories, avatars) {
  const map = new Map();
  const rows = avatars instanceof Map ? avatars : Object.entries(avatars || {});
  for (const [handle, url] of rows) {
    const key = String(handle || "")
      .replace(/^@+/, "")
      .trim()
      .toLowerCase();
    const face = displayAvatarUrl(url);
    if (key && face) map.set(key, face);
  }
  return stories.map((story) => {
    const owned = displayAvatarUrl(story.avatar);
    if (owned) return { ...story, avatar: owned };
    const key = String(story.source || "")
      .replace(/^@+/, "")
      .trim()
      .toLowerCase();
    const fromStore = map.get(key) || null;
    return fromStore ? { ...story, avatar: fromStore } : story;
  });
}

/**
 * Mesma foto da matéria: story.avatar, senão a do perfil extra.
 * @param {unknown} avatar
 * @param {unknown} [extra]
 */
export function resolveFace(avatar, extra) {
  return displayAvatarUrl(avatar) || displayAvatarUrl(extra) || "";
}

/**
 * @param {unknown[]} handles
 * @returns {string} filtro PostgREST `in.(...)` — só os handles da página
 */
export function avatarInFilter(handles) {
  const seen = new Set();
  const parts = [];
  for (const raw of handles) {
    const h = String(raw || "")
      .replace(/^@+/, "")
      .trim();
    if (!/^[A-Za-z0-9_]{1,15}$/.test(h)) continue;
    for (const variant of [h, h.toLowerCase()]) {
      if (seen.has(variant)) continue;
      seen.add(variant);
      parts.push(`"${variant}"`);
    }
  }
  return parts.join(",");
}

/**
 * Não apaga a foto que a matéria já hidratou quando o feed reingesta o stub.
 * @param {Array<{ id?: string, source?: string, avatar?: string | null }>} incoming
 * @param {Record<string, { source?: string, avatar?: string | null }>} [existing]
 */
export function mergeAvatarsIntoStories(incoming, existing = {}) {
  const faces = new Map();
  for (const row of Object.values(existing)) {
    const key = String(row?.source || "")
      .replace(/^@+/, "")
      .trim()
      .toLowerCase();
    const face = displayAvatarUrl(row?.avatar);
    if (key && face) faces.set(key, face);
  }
  for (const item of incoming) {
    const key = String(item.source || "")
      .replace(/^@+/, "")
      .trim()
      .toLowerCase();
    const face = displayAvatarUrl(item.avatar);
    if (key && face) faces.set(key, face);
  }
  return incoming.map((item) => {
    const owned = displayAvatarUrl(item.avatar);
    if (owned) return { ...item, avatar: owned };
    const prev = existing[item.id];
    const avatar =
      displayAvatarUrl(prev?.avatar) ||
      faces.get(
        String(item.source || "")
          .replace(/^@+/, "")
          .trim()
          .toLowerCase(),
      ) ||
      null;
    return avatar ? { ...item, avatar } : item;
  });
}

/**
 * @param {unknown} raw
 * @param {string} [fallbackHandle]
 */
export function storedProfileFromRow(raw, fallbackHandle = "") {
  if (!raw || typeof raw !== "object") return null;
  const o = /** @type {Record<string, unknown>} */ (raw);
  const handle = String(o.handle || o.account || fallbackHandle || "")
    .replace(/^@+/, "")
    .trim();
  if (!handle) return null;
  const avatar = displayAvatarUrl(o.avatar || o.image_url || null);
  return {
    handle,
    name: String(o.name || o.translation_pt || handle),
    bio: String(o.bio || o.content || ""),
    summary_pt: String(o.summary_pt || ""),
    avatar,
    followers: Number(o.followers ?? o.media_label) || 0,
    last_post: parseLastPost(o.last_post),
    updated_at: String(o.updated_at || o.posted_at || ""),
  };
}
