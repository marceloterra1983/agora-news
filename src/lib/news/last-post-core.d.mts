export type StoredLastPost = {
  id: string;
  text: string;
  url: string;
  publishedAt: string;
};

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
