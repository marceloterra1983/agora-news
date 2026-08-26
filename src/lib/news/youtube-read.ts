import type { YoutubeChannel, YoutubeVideo, VideoWithChannel } from "./youtube-types";

export function filterEnabledChannels(channels: YoutubeChannel[]): YoutubeChannel[] {
  return channels.filter((ch) => ch.enabled);
}

export function filterVideosByChannel(
  videos: YoutubeVideo[],
  channelId: string | null,
): YoutubeVideo[] {
  if (!channelId) return videos;
  return videos.filter((v) => v.channel_id === channelId);
}

export function sortByPublishedDesc(videos: YoutubeVideo[]): YoutubeVideo[] {
  return [...videos].sort((a, b) => {
    return (b.published_at || "").localeCompare(a.published_at || "");
  });
}

export function attachChannelToVideos(
  videos: YoutubeVideo[],
  channels: YoutubeChannel[],
): VideoWithChannel[] {
  const channelMap = new Map(channels.map((ch) => [ch.channel_id, ch]));
  return videos.map((v) => ({
    ...v,
    channel: channelMap.get(v.channel_id),
  }));
}
