export type RssItem = {
  guid: string;
  title: string;
  link: string;
  publishedAt: string;
  summary: string;
};

export function parseFeedXml(xml: string, feedUrl?: string): RssItem[];
