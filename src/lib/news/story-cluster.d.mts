import type { Story } from "./types";

export const CLUSTER_WINDOW_MS: number;
export const CLUSTER_JACCARD: number;

export type StoryCluster = {
  id: string;
  head: Story;
  members: Story[];
  publishedAt: string;
};

export function canonicalUrl(url: string): string;
export function headlineTokens(title: string): string[];
export function jaccard(a: string[] | string, b: string[] | string): number;
export function clusterStories(stories: Story[], now?: number): StoryCluster[];
export function attachClusterChrome(stories: Story[]): Story[];
