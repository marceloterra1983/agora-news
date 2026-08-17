import { safeHttpHref } from "./last-post-core.mjs";
import type { Story, StoryAsset, StoryQuote, StoryQuoteCard, StoryXArticle } from "./types";

export type { StoryAsset };

export type TweetEmbed = {
  assets: StoryAsset[];
  quoted: StoryQuote | null;
  replyTo: StoryQuote | null;
  card: StoryQuoteCard | null;
  article: StoryXArticle | null;
  text: string;
};

type FxItem = {
  type?: string;
  url?: string;
  thumbnail_url?: string;
  width?: number;
  height?: number;
  formats?: Array<{ url?: string; container?: string; bitrate?: number }>;
  variants?: Array<{ url?: string; bitrate?: number; content_type?: string }>;
};

type FxCard = {
  url?: string;
  title?: string;
  description?: string;
  domain?: string;
  image?: { url?: string } | string;
};

type FxAuthor = {
  name?: string;
  screen_name?: string;
  avatar_url?: string;
};

type FxArticle = {
  id?: string;
  title?: string;
  preview_text?: string;
  cover_media?: { media_info?: { original_img_url?: string } };
  content?: { blocks?: Array<{ text?: string }> };
};

type FxTweet = {
  id?: string;
  text?: string;
  url?: string;
  author?: FxAuthor;
  media?: { all?: FxItem[]; photos?: FxItem[]; videos?: FxItem[] };
  card?: FxCard;
  article?: FxArticle;
  quote?: FxTweet;
  retweet?: FxTweet;
  replying_to?: string | null;
  replying_to_status?: string | null;
};

const EMPTY: TweetEmbed = {
  assets: [],
  quoted: null,
  replyTo: null,
  card: null,
  article: null,
  text: "",
};

function bestVideoUrl(item: FxItem): string | null {
  const mp4s = [
    ...(item.formats ?? []).filter((f) => f.container === "mp4" && f.url),
    ...(item.variants ?? []).filter((v) => (v.content_type || "").includes("mp4") && v.url),
  ];
  if (mp4s.length) {
    mp4s.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
    const mid = mp4s.find((f) => (f.bitrate || 0) > 0 && (f.bitrate || 0) <= 3_000_000);
    return (mid || mp4s[0]).url || null;
  }
  if (item.url && /\.mp4(\?|$)/i.test(item.url)) return item.url;
  return null;
}

function fromItems(items: FxItem[] | undefined): StoryAsset[] {
  if (!items?.length) return [];
  const out: StoryAsset[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const kind = (item.type || "").toLowerCase();
    if (kind === "video" || kind === "gif") {
      const url = bestVideoUrl(item);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      out.push({
        type: "video",
        url,
        poster: item.thumbnail_url,
        width: item.width,
        height: item.height,
      });
      continue;
    }
    if (item.url && item.url.startsWith("http") && !seen.has(item.url)) {
      seen.add(item.url);
      out.push({
        type: "photo",
        url: item.url.replace(/name=\w+$/, "name=orig"),
        width: item.width,
        height: item.height,
      });
    }
  }
  return out;
}

function cardFrom(raw?: FxCard | null): StoryQuoteCard | null {
  if (!raw?.title && !raw?.url) return null;
  const image =
    typeof raw.image === "string"
      ? raw.image
      : raw.image?.url && raw.image.url.startsWith("http")
        ? raw.image.url
        : null;
  return {
    url: safeHttpHref(raw.url || "", { allowPath: false }),
    title: raw.title || raw.domain || "Link",
    description: raw.description || "",
    domain: raw.domain || "",
    image,
  };
}

function articleFrom(raw: FxArticle | undefined, tweet: FxTweet): StoryXArticle | null {
  if (!raw?.title && !raw?.id) return null;
  const handle = (tweet.author?.screen_name || "i").replace(/^@+/, "");
  const id = String(raw.id || tweet.id || "").trim();
  const paragraphs = (raw.content?.blocks ?? [])
    .map((b) => (b.text || "").trim())
    .filter(Boolean)
    .slice(0, 8);
  return {
    id,
    title: raw.title || "Artigo",
    preview: raw.preview_text || paragraphs[0] || "",
    cover: raw.cover_media?.media_info?.original_img_url || null,
    url: safeHttpHref(id ? `https://x.com/${handle}/article/${id}` : tweet.url || "", { allowPath: false }),
    paragraphs,
  };
}

function quoteFromTweet(inner: FxTweet | undefined, kind: StoryQuote["kind"]): StoryQuote | null {
  if (!inner) return null;
  const handle = (inner.author?.screen_name || "i").replace(/^@+/, "");
  const id = String(inner.id || "").trim();
  const text = (inner.text || "").trim();
  if (!id && !text) return null;
  const photo = fromItems(inner.media?.all || inner.media?.photos)[0];
  const card = cardFrom(inner.card);
  return {
    id,
    handle,
    name: inner.author?.name || handle,
    avatar: inner.author?.avatar_url || null,
    text,
    url: safeHttpHref(inner.url || (id ? `https://x.com/${handle}/status/${id}` : ""), { allowPath: false }),
    image: photo?.url || card?.image || null,
    kind,
    card,
  };
}

export async function fetchTweet(handle: string, id: string): Promise<FxTweet | null> {
  const who = handle.replace(/^@+/, "").trim() || "i";
  try {
    const res = await fetch(`https://api.fxtwitter.com/${encodeURIComponent(who)}/status/${encodeURIComponent(id)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { tweet?: FxTweet };
    return body.tweet ?? null;
  } catch {
    return null;
  }
}

export async function embedForStory(story: Pick<Story, "id" | "source">): Promise<TweetEmbed> {
  if (!story.id) return EMPTY;
  const tweet = await fetchTweet(story.source, story.id);
  if (!tweet) return EMPTY;

  let replyTo: StoryQuote | null = null;
  if (tweet.replying_to_status && tweet.replying_to) {
    const parent = await fetchTweet(String(tweet.replying_to), String(tweet.replying_to_status));
    replyTo = quoteFromTweet(parent ?? undefined, "reply");
    if (!replyTo) {
      replyTo = {
        id: String(tweet.replying_to_status),
        handle: String(tweet.replying_to).replace(/^@+/, ""),
        name: String(tweet.replying_to),
        text: "",
        url: `https://x.com/${tweet.replying_to}/status/${tweet.replying_to_status}`,
        kind: "reply",
      };
    }
  }

  const quoted =
    quoteFromTweet(tweet.quote, "quote") || quoteFromTweet(tweet.retweet, "repost");

  let assets = fromItems(tweet.media?.all || tweet.media?.photos || tweet.media?.videos);
  if (!assets.length && tweet.quote) {
    assets = fromItems(tweet.quote.media?.all || tweet.quote.media?.photos);
  }

  return {
    assets,
    quoted,
    replyTo,
    card: cardFrom(tweet.card),
    article: articleFrom(tweet.article, tweet),
    text: (tweet.text || "").trim(),
  };
}
