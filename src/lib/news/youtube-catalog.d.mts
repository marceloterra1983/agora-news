import type { InfluenceRow } from "./influence";

export type YouTubeSeed = {
  channelId: string;
  url: string;
  title: string;
  section: string;
  group: string;
  account: string;
  blurb?: string;
};

export const MAX_YOUTUBE_ITEMS: number;
export const YOUTUBE_SEED: YouTubeSeed[];
export function youtubeGroupFor(section: string): string;
export function youtubeSeedHit(account: string): YouTubeSeed | undefined;
export function youtubeLabelFor(account: string): string;
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
}): InfluenceRow;
export function mergeYouTubeFontes<T extends { handle?: string }>(
  base: T[],
  section: string,
): Array<T | InfluenceRow>;
