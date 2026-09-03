import type { InfluenceRow } from "./influence";

export type YouTubeSeed = {
  channelId: string;
  url: string;
  title: string;
  section: string;
  group: string;
  account: string;
  blurb?: string;
  avatar?: string;
};

export const MAX_YOUTUBE_ITEMS: number;
export const YOUTUBE_SEED: YouTubeSeed[];
export function youtubeGroupFor(section: string): string;
export function youtubeGroupOf(account: string): string;
export function latestYouTubeByAccount<T extends { id?: string; source?: string; account?: string; publishedAt?: string }>(
  stories: T[],
): T[];
export function mergeLatestYouTube<T extends { id?: string; source?: string; account?: string; publishedAt?: string }>(
  timeline: T[],
  latest: T[],
): T[];
export function youtubeSeedHit(account: string): YouTubeSeed | undefined;
export function youtubeLabelFor(account: string): string;
export function youtubeAvatarFor(account: string): string | null;
export function youtubeExtrasFor(
  section: string,
): Array<{
  handle: string;
  name: string;
  section: string;
  group: string;
  url: string;
  channelId: string;
  blurb: string;
  avatar: string | null;
}>;
export function youtubeFonteRow(p: {
  account?: string;
  handle?: string;
  title?: string;
  name?: string;
  group?: string;
  channelId?: string;
  blurb?: string;
  bio?: string;
  avatar?: string | null;
}): InfluenceRow;
export function mergeYouTubeFontes<T extends { handle?: string }>(
  base: T[],
  section: string,
): Array<T | InfluenceRow>;
