import type { StoredLastPost } from "./last-post-core.mjs";

export type StoredProfileRow = {
  handle: string;
  name: string;
  bio: string;
  summary_pt: string;
  avatar: string | null;
  followers: number;
  last_post: StoredLastPost | null;
  last_posts: StoredLastPost[];
  updated_at: string;
};

export function storedProfileFromRow(
  raw: unknown,
  fallbackHandle?: string,
): StoredProfileRow | null;

export function displayAvatarUrl(url: unknown): string | null;

export function withAvatars<T extends { source?: string; avatar?: string | null }>(
  stories: T[],
  avatars: Map<string, string | null> | Record<string, string | null>,
): T[];

export function resolveFace(avatar: unknown, extra?: unknown): string;

export function avatarInFilter(handles: unknown[]): string;

export function mergeAvatarsIntoStories<
  T extends { id?: string; source?: string; avatar?: string | null },
>(incoming: T[], existing?: Record<string, { source?: string; avatar?: string | null }>): T[];
