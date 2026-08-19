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

/**
 * Só aceita face/bio/followers do author quando o screen_name é o handle.
 * Senão o cron grava a foto do tweet anterior (gdb em OpenAI, etc.).
 *
 * @param {string} handle
 * @param {{ screen_name?: string, name?: string, description?: string | null, avatar_url?: string | null, followers?: number } | null | undefined} author
 * @param {{ name?: string, bio?: string, avatar?: string | null, followers?: number }} [prev]
 */
export function profileFieldsFromAuthor(handle, author, prev = {}) {
  const owned = handleKey(handle) && handleKey(handle) === handleKey(author?.screen_name);
  if (!owned) {
    return {
      name: prev.name || handle,
      bio: prev.bio || "",
      avatar: displayAvatarUrl(prev.avatar) || null,
      followers: Number(prev.followers) || 0,
    };
  }
  return {
    name: author?.name || prev.name || handle,
    bio: author?.description?.trim() || prev.bio || "",
    avatar: displayAvatarUrl(author?.avatar_url) || displayAvatarUrl(prev.avatar) || null,
    followers: Number(author?.followers) || prev.followers || 0,
  };
}
