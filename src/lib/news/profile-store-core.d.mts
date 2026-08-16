import type { StoredLastPost } from "./last-post-core.mjs";

export type StoredProfileRow = {
  handle: string;
  name: string;
  bio: string;
  summary_pt: string;
  avatar: string | null;
  followers: number;
  last_post: StoredLastPost | null;
  updated_at: string;
};

export function storedProfileFromRow(raw: unknown, fallbackHandle?: string): StoredProfileRow | null;
export function mergeClientProfile(
  prev: Partial<StoredProfileRow> | null | undefined,
  body: Record<string, unknown> | null | undefined,
): Omit<StoredProfileRow, "updated_at"> | null;
