export const YOUTUBE_ID_RE: RegExp;
export const CHANNEL_ID_RE: RegExp;
export function extractYouTubeId(urlOrId: string): string;
export function youtubeFeedUrl(channelId: string): string;
export function extractChannelIdFromHtml(html: string): string;
