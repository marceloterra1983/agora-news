export type YouTubeSeed = {
  channelId: string;
  url: string;
  title: string;
  section: string;
  group: string;
  account: string;
};

export const MAX_YOUTUBE_ITEMS: number;
export const YOUTUBE_SEED: YouTubeSeed[];
export function youtubeGroupFor(section: string): string;
export function youtubeSeedHit(account: string): YouTubeSeed | undefined;
export function youtubeLabelFor(account: string): string;
