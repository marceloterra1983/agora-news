import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { rssGroupFor } from "./rss-catalog.mjs";
import type { RssFeed } from "./rss-feeds";
import { rssAccountId } from "./rss-id.mjs";
import { assertHttpsRssUrl } from "./rss-owned.mjs";
import { decodeRssBody, parseFeedXml } from "./rss-parse.mjs";
import { normalizeSection } from "./types";

export const resolveRssFeed = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { url: string; section: string }) => ({
    url: String(input?.url || "").trim(),
    section: normalizeSection(input?.section),
  }))
  .handler(async ({ data }): Promise<RssFeed> => {
    const url = assertHttpsRssUrl(data.url);
    const res = await fetch(url, {
      headers: { "User-Agent": "AgoraNews/1.0" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`rss_http_${res.status}`);
    const items = parseFeedXml(
      decodeRssBody(await res.arrayBuffer(), res.headers.get("content-type") || ""),
      url,
    );
    if (!items.length) throw new Error("rss_empty");
    return {
      url,
      title: new URL(url).hostname.replace(/^www\./, ""),
      section: data.section,
      group: rssGroupFor(data.section),
      account: rssAccountId(url),
    };
  });
