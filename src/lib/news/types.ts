export const DEFAULT_SECTION = "ai";

export const FALLBACK_CATEGORIES = ["ai"] as const;

export type Category = string;

export type StoryQuoteCard = {
  url: string;
  title: string;
  description?: string;
  domain?: string;
  image?: string | null;
};

export type StoryQuote = {
  id: string;
  handle: string;
  name: string;
  avatar?: string | null;
  text: string;
  url: string;
  image?: string | null;
  kind: "quote" | "repost" | "reply";
  card?: StoryQuoteCard | null;
};

export type StoryXArticle = {
  id: string;
  title: string;
  preview: string;
  cover: string | null;
  url: string;
  paragraphs: string[];
};


export type StoryAsset = {
  type: "photo" | "video";
  url: string;
  poster?: string;
  width?: number;
  height?: number;
};

export type Story = {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  original: string;
  url: string;
  image: string | null;
  assets?: StoryAsset[];
  quoted?: StoryQuote | null;
  replyTo?: StoryQuote | null;
  card?: StoryQuoteCard | null;
  xArticle?: StoryXArticle | null;
  publishedAt: string;
  source: string;
  sourceLabel: string;
  category: Category;
  media: string;
  batch: string;
};

export const CATEGORY_LABELS: Record<string, string> = {
  ai: "IA",
  tech: "Tech",
  brasil: "Brasil",
};

export function slugifySection(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "ai";
}

export function labelFor(category: string): string {
  if (!category || category === "capa") return CATEGORY_LABELS.ai;
  return CATEGORY_LABELS[category] ?? category.toUpperCase();
}

export function normalizeSection(value?: string | null): Category {
  const raw = (value ?? "").trim();
  if (!raw || raw.toLowerCase() === "capa") return DEFAULT_SECTION;
  return slugifySection(raw);
}
