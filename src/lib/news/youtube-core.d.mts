export const YOUTUBE_ID_RE: RegExp;
export const CHANNEL_ID_RE: RegExp;
export function extractYouTubeId(urlOrId: string): string;
export function youtubeFeedUrl(channelId: string): string;
export function extractChannelIdFromHtml(html: string): string;
export function extractChannelVideosFromHtml(html: string): Array<{
  videoId: string;
  guid: string;
  link: string;
  title: string;
  summary: string;
  publishedAt: string;
  imageUrl: string;
}>;
