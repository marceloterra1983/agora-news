import { createServerFn } from "@tanstack/react-start";
import {
  fetchYoutubeChannels,
  fetchYoutubeVideos,
  fetchYoutubeVideoById,
} from "./supabase-youtube";
import {
  filterEnabledChannels,
  filterVideosByChannel,
  sortByPublishedDesc,
  attachChannelToVideos,
} from "./youtube-read";

type LoadVideosInput = {
  channelId?: string;
};

export const loadVideos = createServerFn({ method: "GET" })
  .validator((input: LoadVideosInput | undefined) => ({
    channelId:
      typeof input?.channelId === "string" && input.channelId.trim()
        ? input.channelId.trim()
        : undefined,
  }))
  .handler(async ({ data }) => {
    const channels = await fetchYoutubeChannels();
    const enabled = filterEnabledChannels(channels);
    const videos = await fetchYoutubeVideos({
      channelId: data.channelId,
      limit: 50,
    });
    const filtered = filterVideosByChannel(videos, data.channelId ?? null);
    const sorted = sortByPublishedDesc(filtered);
    const enriched = attachChannelToVideos(sorted, enabled);
    return { videos: enriched, channels: enabled };
  });

export const loadVideoById = createServerFn({ method: "GET" })
  .validator((input: string) => String(input || ""))
  .handler(async ({ data: videoId }) => {
    const video = await fetchYoutubeVideoById(videoId);
    if (!video) return null;
    const channels = await fetchYoutubeChannels();
    const channel = channels.find((c) => c.channel_id === video.channel_id);
    return { ...video, channel: channel ?? undefined };
  });
