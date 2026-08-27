export function ingestSurvives(xFailed: boolean, rssWritten: number): boolean;
export function skipRssResponse(status: number): boolean;
export function rssIdsToSkip(
  ids: string[],
  opts: { known: Set<string>; poisoned: Set<string>; latest: Set<string> },
): Set<string>;
export function rssPostsFromItems(
  feed: { url?: string; account?: string; section: string },
  items: Array<{ guid?: string; link?: string; title?: string; summary?: string; publishedAt?: string }>,
  known: Set<string>,
  batch: string,
  translated?: Record<string, { title: string; summary: string }>,
): Array<{
  post_id: string;
  account: string;
  posted_at: string;
  content: string;
  translation_pt: string;
  summary_pt: string;
  post_url: string;
  media_label: string;
  image_url: string;
  category: string;
  batch_name: string;
  source: "rss";
}>;
