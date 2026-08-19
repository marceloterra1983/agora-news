export type StoredLastPost = {
  id: string;
  text: string;
  url: string;
  publishedAt: string;
};

export function safeHttpHref(raw: unknown, opts?: { allowPath?: boolean }): string;
export function parseLastPost(raw: unknown): StoredLastPost | null;
export function lastPostHref(handle: string, id: string, inApp: boolean): string;
export function keepLastPost(
  prev: StoredLastPost | null | undefined,
  next: StoredLastPost | null | undefined,
): StoredLastPost | null;
export function storedToLastHit(post: StoredLastPost | null | undefined): {
  id: string;
  title: string;
  publishedAt: string;
  count: number;
} | null;
export function preferNewerLast<T extends { publishedAt: string }>(a: T | null, b: T | null): T | null;
export const LAST_POST_STALE_MS: number;
export function lastPostIsStale(
  post: { publishedAt?: string } | null | undefined,
  now?: number,
): boolean;
export function isSyntheticPostId(id: unknown): boolean;
export function usableTweetId(id: unknown, url: unknown): string;
export function lastPostFromXLastRow(
  row: Record<string, unknown> | null | undefined,
  handle?: string,
): StoredLastPost | null;
export function pickRecentFromPostRows(
  rows: Array<Record<string, unknown>>,
  handle: string,
  max?: number,
): StoredLastPost[];
export function pickLatestFromPostRows(
  rows: Array<Record<string, unknown>>,
  handle: string,
): StoredLastPost | null;
export function xLastListParams(category?: string): URLSearchParams;
