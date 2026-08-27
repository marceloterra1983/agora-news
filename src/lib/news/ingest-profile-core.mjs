/**
 * Face/bio do tweet no perfil persistido.
 * O timeline do fxtwitter mistura authors (repost, menção, reply).
 */
import { displayAvatarUrl } from "./profile-store-core.mjs";

function handleKey(value) {
  return String(value || "")
    .replace(/^@+/, "")
    .trim()
    .toLowerCase();
}

/** Mesmo upload do X, independente do sufixo de tamanho. */
function faceKey(url) {
  const raw = typeof url === "string" ? url.trim() : "";
  if (!/^https?:\/\//i.test(raw)) return "";
  return raw.replace(/_(normal|bigger|mini|200x200|400x400)\./i, ".");
}

/**
 * @param {string} handle
 * @param {Array<{ id?: string, text?: string, author?: { screen_name?: string } }>} [statuses]
 */
export function statusesOwnedByHandle(handle, statuses) {
  const key = handleKey(handle);
  if (!key || !Array.isArray(statuses)) return [];
  return statuses.filter(
    (t) => t?.id && t?.text && handleKey(t.author?.screen_name) === key,
  );
}

export function ownedAuthorFromStatuses(handle, statuses) {
  return statusesOwnedByHandle(handle, statuses)[0]?.author ?? null;
}

/**
 * Só aceita face/bio/followers do author quando o screen_name é o handle.
 * Face persistida igual à do author estrangeiro é veneno — evicta.
 *
 * @param {string} handle
 * @param {{ screen_name?: string, name?: string, description?: string | null, avatar_url?: string | null, followers?: number } | null | undefined} author
 * @param {{ name?: string, bio?: string, avatar?: string | null, followers?: number }} [prev]
 */
export function profileFieldsFromAuthor(handle, author, prev = {}) {
  const owned = handleKey(handle) && handleKey(handle) === handleKey(author?.screen_name);
  if (!owned) {
    const stolen = Boolean(faceKey(prev.avatar) && faceKey(prev.avatar) === faceKey(author?.avatar_url));
    return {
      name: prev.name || handle,
      bio: stolen ? "" : prev.bio || "",
      avatar: stolen ? null : displayAvatarUrl(prev.avatar) || null,
      followers: stolen ? 0 : Number(prev.followers) || 0,
    };
  }
  return {
    name: author?.name || prev.name || handle,
    bio: author?.description?.trim() || prev.bio || "",
    avatar: displayAvatarUrl(author?.avatar_url) || displayAvatarUrl(prev.avatar) || null,
    followers: Number(author?.followers) || prev.followers || 0,
  };
}
