import type { StoredLastPost } from "./last-post-core.mjs";

export const PROFILE_LAST_KEEP: 10;
export const PROFILE_LAST_PAGE: 2;

export function keepLastPosts(
  prev: unknown,
  incoming: unknown,
  max?: number,
): StoredLastPost[];
export function packLastPosts(list: unknown): (StoredLastPost & { recent?: StoredLastPost[] }) | null;
export function unpackLastPosts(raw: unknown): StoredLastPost[];
export function nextProfileShown(shown: number, total: number): number;
export function nextShownByHours<T extends { publishedAt?: string }>(
  posts: T[],
  shown: number,
  hours?: number,
): number;
export function visibleProfilePosts<T>(posts: T[], shown: number): T[];
