export const FEED_MORE_HOURS: 12;
export const FEED_MORE_WIDE_HOURS: 24;
export const FEED_MORE_STEPS: 8;
export const FEED_MORE_LIMIT: 80;
export const FEED_MORE_HOUR_STEPS: readonly [12, 24];

export function windowAfter(beforeIso: string, hours?: number): string;
export function postedAtQuery(opts?: {
  before?: string;
  after?: string;
}): { and?: string; posted_at?: string };
export function intersectAccounts(requested: unknown, allowed: unknown): string[];
export function storyHasText(story?: {
  title?: string;
  body?: string;
  excerpt?: string;
} | null): boolean;
export function shouldWalkEmptyWindow(state: {
  addedVisible: number;
  freshCount: number;
  serverHasMore: boolean;
  steps: number;
}): boolean;
export function nextMoreHours(hours: number): number;
export function moreStillOpen(state: {
  addedVisible: number;
  hours: number;
  unboundedTried: boolean;
  unboundedCount: number;
}): boolean;
