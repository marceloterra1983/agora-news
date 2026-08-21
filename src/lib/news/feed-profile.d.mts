import type { InfluenceRow } from "./influence";
import type { FonteLastPost } from "./influence-last";
import type { Story } from "./types";

export function feedHandle(raw: unknown): string;

export function findFonteRow(
  rows: InfluenceRow[] | null | undefined,
  handle: unknown,
): InfluenceRow | null;

export function lastPostsFromStories(
  stories: Array<Pick<Story, "id" | "source" | "sourceLabel" | "title" | "publishedAt">> | null | undefined,
  handle: unknown,
): FonteLastPost[];

export function fillMissingLastPosts(
  row: InfluenceRow | null | undefined,
  posts: FonteLastPost[] | null | undefined,
): InfluenceRow | null;

export function fallbackFonteRow(input?: {
  handle?: string;
  name?: string;
  avatar?: string | null;
  group?: string;
}): InfluenceRow;

export function resolveFeedProfileRow(input: {
  handle: string;
  rows: InfluenceRow[];
  stories: Story[];
  fallback?: InfluenceRow | null;
}): InfluenceRow | null;
