export const OUTLIER: {
  er: { floorPct: number; vsProfile: number };
  reach: { minViews: number; minFollowers: number; floorRatio: number };
  quality: { minLikes: number; floorPct: number };
};

export function isHighPostEr(post: { er?: number } | null | undefined, profileEr?: number): boolean;
export function isHighPostReach(
  post: { views?: number } | null | undefined,
  followers?: number,
): boolean;
export function isHighPostQuality(
  post: { replies?: number; likes?: number } | null | undefined,
): boolean;
