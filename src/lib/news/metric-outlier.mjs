/**
 * Pisos para chip no card fechado. Baseline X (impressões):
 * ER mediano ~1–2%; alcance típico 5–10% dos seguidores; reply/like ~5–10%.
 * "Bem acima" = piso global OU, no ER, 2× a média da própria conta.
 */

export const OUTLIER = {
  er: { floorPct: 3, vsProfile: 2 },
  reach: { minViews: 200, minFollowers: 100, floorRatio: 0.75 },
  quality: { minLikes: 20, floorPct: 25 },
};

/** @param {{ er?: number } | null | undefined} post @param {number} [profileEr] */
export function isHighPostEr(post, profileEr) {
  const er = Number(post?.er) || 0;
  if (er <= 0) return false;
  const profile = Number(profileEr) || 0;
  return er >= Math.max(OUTLIER.er.floorPct, profile * OUTLIER.er.vsProfile);
}

/** @param {{ views?: number } | null | undefined} post @param {number} [followers] */
export function isHighPostReach(post, followers) {
  const views = Number(post?.views) || 0;
  const fol = Number(followers) || 0;
  if (views < OUTLIER.reach.minViews || fol < OUTLIER.reach.minFollowers) return false;
  return views / fol >= OUTLIER.reach.floorRatio;
}

/** @param {{ replies?: number, likes?: number } | null | undefined} post */
export function isHighPostQuality(post) {
  const likes = Number(post?.likes) || 0;
  const replies = Number(post?.replies) || 0;
  if (likes < OUTLIER.quality.minLikes) return false;
  return (replies / likes) * 100 >= OUTLIER.quality.floorPct;
}
