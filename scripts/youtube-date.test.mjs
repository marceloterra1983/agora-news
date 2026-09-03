import assert from "node:assert/strict";
import test from "node:test";
import { fetchVideoPublishedAt } from "../src/lib/news/youtube-core.mjs";

test("fetchVideoPublishedAt extracts real datePublished from video watch HTML", async () => {
  const mockWatchHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta itemprop="name" content="Introducing Claude Fable 5.1">
        <meta itemprop="datePublished" content="2026-09-01T18:02:31-07:00">
        <meta itemprop="uploadDate" content="2026-09-01T18:02:31-07:00">
      </head>
      <body></body>
    </html>
  `;

  const date = await fetchVideoPublishedAt("ROF2Nv_KjOM", async () => {
    return new Response(mockWatchHtml, { status: 200, headers: { "content-type": "text/html" } });
  });

  assert.ok(date);
  assert.equal(new Date(date).toISOString(), "2026-09-02T01:02:31.000Z");
});

test("fetchVideoPublishedAt returns empty string when video page has no publication date", async () => {
  const date = await fetchVideoPublishedAt("invalid_vid", async () => {
    return new Response("<html><body>Not found</body></html>", { status: 404 });
  });

  assert.equal(date, "");
});
