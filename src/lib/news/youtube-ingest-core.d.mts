import type { UpsertPost } from "./admin";

export function resolveYouTubeChannelItems(
  channel: { url: string; channelId?: string },
  opts?: {
    fetchImpl?: typeof fetch;
    maxItemsPerChannel?: number;
    headers?: Record<string, string>;
  },
): Promise<
  Array<{
    videoId?: string;
    guid?: string;
    link?: string;
    title?: string;
    summary?: string;
    publishedAt?: string;
    imageUrl?: string;
  }>
>;

export function youtubePostsFromItems(
  channel: { account: string; section?: string },
  items: Array<{
    videoId?: string;
    guid?: string;
    link?: string;
    title?: string;
    summary?: string;
    publishedAt?: string;
    imageUrl?: string;
  }>,
  known: Set<string>,
  batch: string,
  translated?: Record<string, { title: string; summary: string }>,
  now?: number,
): UpsertPost[];
