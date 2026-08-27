export type RssItem = {
  guid: string;
  title: string;
  link: string;
  publishedAt: string;
  summary: string;
};

export function textHasReplacement(value: unknown): boolean;
export function decodeRssBody(
  input: ArrayBuffer | ArrayBufferView,
  contentType?: string,
): string;
export function parseFeedXml(xml: string, feedUrl?: string): RssItem[];
