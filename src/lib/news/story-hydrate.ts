import { hydrateStoryBody } from "./translate-pt.mjs";
import { readAvatarsByHandles, readStoredProfile } from "./profile-store";
import { displayAvatarUrl, withAvatars } from "./profile-store-core.mjs";
import { isYouTubeAccount } from "./rss-id.mjs";
import { youtubeAvatarFor } from "./youtube-catalog.mjs";
import type { Story } from "./types";

const FACE_TTL = 10 * 60_000;
const faceCache = new Map<string, { at: number; avatar: string | null }>();

function handleKey(handle: string): string {
  return handle.replace(/^@+/, "").trim().toLowerCase();
}

async function avatarMapFor(handles: string[]): Promise<Map<string, string>> {
  const now = Date.now();
  const map = new Map<string, string>();
  const missing: string[] = [];
  for (const raw of handles) {
    const key = handleKey(raw);
    if (!key) continue;
    const hit = faceCache.get(key);
    if (hit && now - hit.at < FACE_TTL) {
      if (hit.avatar) map.set(key, hit.avatar);
      continue;
    }
    missing.push(raw);
  }
  if (!missing.length) return map;
  const fetched = await readAvatarsByHandles(missing);
  const seen = new Set(missing.map(handleKey));
  for (const key of seen) {
    const face = fetched.get(key) || null;
    faceCache.set(key, { at: now, avatar: face });
    if (face) map.set(key, face);
  }
  return map;
}

async function avatarOf(handle: string): Promise<string | null> {
  const key = handleKey(handle);
  if (!key) return null;
  try {
    return (await avatarMapFor([handle])).get(key) || null;
  } catch {
    return displayAvatarUrl((await readStoredProfile(handle))?.avatar) || null;
  }
}

export async function attachStoryAvatars(stories: Story[]): Promise<Story[]> {
  if (!stories.length) return stories;
  const withYt = stories.map((s) => {
    if (!s.avatar && (isYouTubeAccount(s.source) || s.id.startsWith("yt_"))) {
      const face = youtubeAvatarFor(s.source);
      if (face) return { ...s, avatar: face };
    }
    return s;
  });
  try {
    return withAvatars(
      withYt,
      await avatarMapFor(withYt.map((s) => s.source)),
    );
  } catch {
    return withAvatars(withYt, new Map());
  }
}

export async function hydrateStory(story: Story): Promise<Story> {
  const body =
    (await hydrateStoryBody(story.original, story.body || story.excerpt)) ||
    story.original ||
    story.title;
  const ytFace = isYouTubeAccount(story.source) || story.id.startsWith("yt_") ? youtubeAvatarFor(story.source) : null;
  const avatar = displayAvatarUrl(story.avatar) || ytFace || (await avatarOf(story.source));
  return { ...story, body, avatar };
}
