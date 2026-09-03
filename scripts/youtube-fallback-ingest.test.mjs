import assert from "node:assert/strict";
import test from "node:test";
import { resolveYouTubeChannelItems, youtubePostsFromItems } from "../src/lib/news/youtube-ingest-core.mjs";
import { unpackMediaLabel } from "../src/lib/news/story-media-meta.mjs";

const CHANNEL_HTML_MOCK = `
  <html>
    <script>
      var ytInitialData = {
        "contents": {
          "twoColumnBrowseResultsRenderer": {
            "tabs": [
              {
                "tabRenderer": {
                  "selected": true,
                  "content": {
                    "richGridRenderer": {
                      "contents": [
                        {
                          "richItemRenderer": {
                            "content": {
                              "lockupViewModel": {
                                "contentId": "ROF2Nv_KjOM",
                                "metadata": {
                                  "lockupMetadataViewModel": {
                                    "title": { "content": "Introducing Claude Fable" }
                                  }
                                }
                              }
                            }
                          }
                        },
                        {
                          "richItemRenderer": {
                            "content": {
                              "lockupViewModel": {
                                "contentId": "older_video_123",
                                "metadata": {
                                  "lockupMetadataViewModel": {
                                    "title": { "content": "Older Video" }
                                  }
                                }
                              }
                            }
                          }
                        }
                      ]
                    }
                  }
                }
              }
            ]
          }
        }
      };
    </script>
  </html>
`;

test("resolveYouTubeChannelItems triggers channel HTML fallback when feed 404s and takes latest 1 video", async () => {
  const channel = {
    channelId: "UCrDwWp7EBBv4NwvScIpBDOA",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCrDwWp7EBBv4NwvScIpBDOA",
    title: "Anthropic",
    section: "ai",
    group: "labs",
    account: "y_b01b6db24262",
  };

  const items = await resolveYouTubeChannelItems(channel, {
    maxItemsPerChannel: 1,
    fetchImpl: async (url) => {
      if (url.includes("feeds/videos.xml")) {
        return new Response("Not Found", { status: 404 });
      }
      if (url.includes("/videos")) {
        return new Response(CHANNEL_HTML_MOCK, { status: 200, headers: { "content-type": "text/html" } });
      }
      if (url.includes("watch?v=ROF2Nv_KjOM")) {
        return new Response('<meta itemprop="datePublished" content="2026-09-01T18:02:31-07:00">', { status: 200 });
      }
      return new Response("Not Found", { status: 404 });
    },
  });

  assert.equal(items.length, 1);
  assert.equal(items[0].videoId, "ROF2Nv_KjOM");
  assert.equal(items[0].title, "Introducing Claude Fable");

  const translated = {
    yt_ROF2Nv_KjOM: {
      title: "Apresentação do Claude Fable",
      summary: "Apresentação do Claude Fable",
    },
  };

  const rows = youtubePostsFromItems(channel, items, new Set(), "2026-09-03", translated);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].post_id, "yt_ROF2Nv_KjOM");
  assert.equal(rows[0].account, "y_b01b6db24262");
  assert.equal(rows[0].summary_pt, "Apresentação do Claude Fable");
  assert.equal(rows[0].source, "youtube");

  const media = unpackMediaLabel(rows[0].media_label);
  assert.equal(media.label, "Vídeo");
  assert.equal(media.meta?.assets?.[0]?.type, "youtube");
  assert.equal(media.meta?.assets?.[0]?.videoId, "ROF2Nv_KjOM");
});
