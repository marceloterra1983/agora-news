export type YoutubeChannel = {
  channel_id: string;
  handle: string;
  name: string;
  avatar_url: string | null;
  enabled: boolean;
  updated_at: string;
};

export type YoutubeVideo = {
  video_id: string;
  channel_id: string;
  title: string;
  headline: string;
  summary_pt: string;
  watch_url: string;
  thumbnail_url: string;
  published_at: string;
  duration_seconds: number | null;
  was_live: boolean;
  caption_status: string;
  created_at: string;
};

export type VideoWithChannel = YoutubeVideo & { channel?: YoutubeChannel };
