import assert from "node:assert/strict";
import test from "node:test";
import { extractChannelVideosFromHtml } from "../src/lib/news/youtube-core.mjs";

test("extractChannelVideosFromHtml parses lockupViewModel structures", () => {
  const htmlWithLockup = `
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
                                  "contentId": "S6TIVzqTmu8",
                                  "metadata": {
                                    "lockupMetadataViewModel": {
                                      "title": { "content": "Magic Manga Girl" }
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

  const items = extractChannelVideosFromHtml(htmlWithLockup);
  assert.equal(items.length, 1);
  assert.equal(items[0].videoId, "S6TIVzqTmu8");
  assert.equal(items[0].title, "Magic Manga Girl");
  assert.equal(items[0].link, "https://www.youtube.com/watch?v=S6TIVzqTmu8");
  assert.equal(items[0].imageUrl, "https://i.ytimg.com/vi/S6TIVzqTmu8/hqdefault.jpg");
});

test("extractChannelVideosFromHtml parses videoRenderer structures", () => {
  const htmlWithRenderer = `
    <html>
      <script>
        var ytInitialData = {
          "contents": {
            "sectionListRenderer": {
              "contents": [
                {
                  "itemSectionRenderer": {
                    "contents": [
                      {
                        "videoRenderer": {
                          "videoId": "F5_G0AHfYhI",
                          "title": { "runs": [{ "text": "Physics Bet" }] },
                          "descriptionSnippet": { "runs": [{ "text": "Video description here" }] }
                        }
                      }
                    ]
                  }
                }
              ]
            }
          }
        };
      </script>
    </html>
  `;

  const items = extractChannelVideosFromHtml(htmlWithRenderer);
  assert.equal(items.length, 1);
  assert.equal(items[0].videoId, "F5_G0AHfYhI");
  assert.equal(items[0].title, "Physics Bet");
  assert.equal(items[0].summary, "Video description here");
});

test("extractChannelVideosFromHtml returns empty array on invalid HTML", () => {
  assert.deepEqual(extractChannelVideosFromHtml(""), []);
  assert.deepEqual(extractChannelVideosFromHtml("<html>no ytInitialData</html>"), []);
  assert.deepEqual(extractChannelVideosFromHtml("<script>var ytInitialData = { invalid json };</script>"), []);
});
