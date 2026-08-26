import assert from "node:assert/strict";
import test from "node:test";
import {
  filterEnabledChannels,
  filterVideosByChannel,
  sortByPublishedDesc,
  attachChannelToVideos,
} from "../src/lib/news/youtube-read.ts";

test("filterEnabledChannels hides disabled channels", () => {
  const channels = [
    { channel_id: "UC1", handle: "@one", name: "One", avatar_url: null, enabled: true, updated_at: "2026-08-01T00:00:00Z" },
    { channel_id: "UC2", handle: "@two", name: "Two", avatar_url: null, enabled: false, updated_at: "2026-08-02T00:00:00Z" },
    { channel_id: "UC3", handle: "@three", name: "Three", avatar_url: null, enabled: true, updated_at: "2026-08-03T00:00:00Z" },
  ];
  const result = filterEnabledChannels(channels);
  assert.equal(result.length, 2);
  assert.equal(result[0].channel_id, "UC1");
  assert.equal(result[1].channel_id, "UC3");
});

test("filterEnabledChannels handles empty list", () => {
  assert.deepEqual(filterEnabledChannels([]), []);
});

test("filterVideosByChannel filters by channel_id", () => {
  const videos = [
    {
      video_id: "V1",
      channel_id: "UC1",
      title: "Video 1",
      headline: "Headline 1",
      summary_pt: "Summary 1",
      watch_url: "https://youtube.com/watch?v=V1",
      thumbnail_url: "https://i.ytimg.com/vi/V1/mqdefault.jpg",
      published_at: "2026-08-26T10:00:00Z",
      duration_seconds: 120,
      was_live: false,
      caption_status: "ok",
      created_at: "2026-08-26T10:00:00Z",
    },
    {
      video_id: "V2",
      channel_id: "UC2",
      title: "Video 2",
      headline: "Headline 2",
      summary_pt: "Summary 2",
      watch_url: "https://youtube.com/watch?v=V2",
      thumbnail_url: "https://i.ytimg.com/vi/V2/mqdefault.jpg",
      published_at: "2026-08-26T11:00:00Z",
      duration_seconds: 180,
      was_live: false,
      caption_status: "ok",
      created_at: "2026-08-26T11:00:00Z",
    },
  ];
  const result = filterVideosByChannel(videos, "UC1");
  assert.equal(result.length, 1);
  assert.equal(result[0].video_id, "V1");
});

test("filterVideosByChannel returns all when channelId is null", () => {
  const videos = [
    {
      video_id: "V1",
      channel_id: "UC1",
      title: "Video 1",
      headline: "H1",
      summary_pt: "S1",
      watch_url: "https://youtube.com/watch?v=V1",
      thumbnail_url: "https://i.ytimg.com/vi/V1/mqdefault.jpg",
      published_at: "2026-08-26T10:00:00Z",
      duration_seconds: 120,
      was_live: false,
      caption_status: "ok",
      created_at: "2026-08-26T10:00:00Z",
    },
    {
      video_id: "V2",
      channel_id: "UC2",
      title: "Video 2",
      headline: "H2",
      summary_pt: "S2",
      watch_url: "https://youtube.com/watch?v=V2",
      thumbnail_url: "https://i.ytimg.com/vi/V2/mqdefault.jpg",
      published_at: "2026-08-26T11:00:00Z",
      duration_seconds: 180,
      was_live: false,
      caption_status: "ok",
      created_at: "2026-08-26T11:00:00Z",
    },
  ];
  const result = filterVideosByChannel(videos, null);
  assert.equal(result.length, 2);
});

test("sortByPublishedDesc sorts newest first", () => {
  const videos = [
    {
      video_id: "V1",
      channel_id: "UC1",
      title: "Oldest",
      headline: "H",
      summary_pt: "S",
      watch_url: "https://youtube.com/watch?v=V1",
      thumbnail_url: "https://i.ytimg.com/vi/V1/mqdefault.jpg",
      published_at: "2026-08-26T08:00:00Z",
      duration_seconds: 120,
      was_live: false,
      caption_status: "ok",
      created_at: "2026-08-26T08:00:00Z",
    },
    {
      video_id: "V2",
      channel_id: "UC1",
      title: "Newest",
      headline: "H",
      summary_pt: "S",
      watch_url: "https://youtube.com/watch?v=V2",
      thumbnail_url: "https://i.ytimg.com/vi/V2/mqdefault.jpg",
      published_at: "2026-08-26T12:00:00Z",
      duration_seconds: 180,
      was_live: false,
      caption_status: "ok",
      created_at: "2026-08-26T12:00:00Z",
    },
    {
      video_id: "V3",
      channel_id: "UC1",
      title: "Middle",
      headline: "H",
      summary_pt: "S",
      watch_url: "https://youtube.com/watch?v=V3",
      thumbnail_url: "https://i.ytimg.com/vi/V3/mqdefault.jpg",
      published_at: "2026-08-26T10:00:00Z",
      duration_seconds: 150,
      was_live: false,
      caption_status: "ok",
      created_at: "2026-08-26T10:00:00Z",
    },
  ];
  const result = sortByPublishedDesc(videos);
  assert.equal(result[0].video_id, "V2");
  assert.equal(result[1].video_id, "V3");
  assert.equal(result[2].video_id, "V1");
});

test("sortByPublishedDesc handles empty list and single item", () => {
  assert.deepEqual(sortByPublishedDesc([]), []);
  const single = [{
    video_id: "V1",
    channel_id: "UC1",
    title: "Only",
    headline: "H",
    summary_pt: "S",
    watch_url: "https://youtube.com/watch?v=V1",
    thumbnail_url: "https://i.ytimg.com/vi/V1/mqdefault.jpg",
    published_at: "2026-08-26T10:00:00Z",
    duration_seconds: 120,
    was_live: false,
    caption_status: "ok",
    created_at: "2026-08-26T10:00:00Z",
  }];
  assert.deepEqual(sortByPublishedDesc(single), single);
});

test("attachChannelToVideos enriches videos with channel info", () => {
  const channels = [
    { channel_id: "UC1", handle: "@one", name: "Channel One", avatar_url: "https://example.com/avatar1.jpg", enabled: true, updated_at: "2026-08-01T00:00:00Z" },
    { channel_id: "UC2", handle: "@two", name: "Channel Two", avatar_url: null, enabled: true, updated_at: "2026-08-02T00:00:00Z" },
  ];
  const videos = [
    {
      video_id: "V1",
      channel_id: "UC1",
      title: "Video 1",
      headline: "H1",
      summary_pt: "S1",
      watch_url: "https://youtube.com/watch?v=V1",
      thumbnail_url: "https://i.ytimg.com/vi/V1/mqdefault.jpg",
      published_at: "2026-08-26T10:00:00Z",
      duration_seconds: 120,
      was_live: false,
      caption_status: "ok",
      created_at: "2026-08-26T10:00:00Z",
    },
    {
      video_id: "V2",
      channel_id: "UC2",
      title: "Video 2",
      headline: "H2",
      summary_pt: "S2",
      watch_url: "https://youtube.com/watch?v=V2",
      thumbnail_url: "https://i.ytimg.com/vi/V2/mqdefault.jpg",
      published_at: "2026-08-26T11:00:00Z",
      duration_seconds: 180,
      was_live: false,
      caption_status: "ok",
      created_at: "2026-08-26T11:00:00Z",
    },
    {
      video_id: "V3",
      channel_id: "UC3",
      title: "Video 3",
      headline: "H3",
      summary_pt: "S3",
      watch_url: "https://youtube.com/watch?v=V3",
      thumbnail_url: "https://i.ytimg.com/vi/V3/mqdefault.jpg",
      published_at: "2026-08-26T12:00:00Z",
      duration_seconds: 200,
      was_live: false,
      caption_status: "ok",
      created_at: "2026-08-26T12:00:00Z",
    },
  ];
  const result = attachChannelToVideos(videos, channels);
  assert.equal(result.length, 3);
  assert.equal(result[0].channel?.name, "Channel One");
  assert.equal(result[1].channel?.name, "Channel Two");
  assert.equal(result[2].channel, undefined);
});
