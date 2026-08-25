import type { Story } from "./types";

export type FeedOrdem = "recente" | "seguindo" | "importante";

export const FEED_ORDENS: FeedOrdem[];

export function normalizeOrdem(value: unknown): FeedOrdem;

export function rankStories(
  stories: Story[],
  ordem: string,
  signals?: {
    starred?: string[];
    watched?: string[];
    read?: Set<string> | string[];
    hasBaseline?: boolean;
    now?: number;
  },
): Story[];
