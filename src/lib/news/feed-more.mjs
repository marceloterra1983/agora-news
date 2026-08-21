/** Paginação do feed: janela de 12 horas a partir do último post visível. */
export const FEED_MORE_HOURS = 12;
export const FEED_MORE_WIDE_HOURS = 24;
export const FEED_MORE_STEPS = 8;
export const FEED_MORE_LIMIT = 80;
export const FEED_MORE_HOUR_STEPS = [FEED_MORE_HOURS, FEED_MORE_WIDE_HOURS];

/**
 * @param {string} beforeIso
 * @param {number} [hours]
 */
export function windowAfter(beforeIso, hours = FEED_MORE_HOURS) {
  const t = Date.parse(beforeIso);
  if (!Number.isFinite(t)) return "";
  return new Date(t - Math.max(1, Number(hours) || FEED_MORE_HOURS) * 3_600_000).toISOString();
}

/**
 * @param {{ before?: string, after?: string }} opts
 */
export function postedAtQuery(opts = {}) {
  const before = typeof opts.before === "string" ? opts.before.trim() : "";
  const after = typeof opts.after === "string" ? opts.after.trim() : "";
  if (before && after) return { and: `(posted_at.lt.${before},posted_at.gte.${after})` };
  if (before) return { posted_at: `lt.${before}` };
  if (after) return { posted_at: `gte.${after}` };
  return {};
}

/**
 * @param {unknown} requested
 * @param {unknown} allowed
 */
export function intersectAccounts(requested, allowed) {
  const allow = new Set(
    (Array.isArray(allowed) ? allowed : []).map((h) =>
      String(h || "")
        .replace(/^@+/, "")
        .trim()
        .toLowerCase(),
    ).filter(Boolean),
  );
  if (!allow.size) return [];
  const want = Array.isArray(requested) ? requested : [];
  if (!want.length) return [...allow];
  return [
    ...new Set(
      want
        .map((h) =>
          String(h || "")
            .replace(/^@+/, "")
            .trim()
            .toLowerCase(),
        )
        .filter((h) => allow.has(h)),
    ),
  ];
}

/**
 * @param {{ title?: string, body?: string, excerpt?: string } | null | undefined} story
 */
export function storyHasText(story) {
  const title = String(story?.title || "").trim();
  const body = String(story?.body || story?.excerpt || "").trim();
  if (!title && !body) return false;
  if (/^sem título$/i.test(title) && !body) return false;
  return true;
}

/**
 * @param {{ addedVisible: number, freshCount: number, serverHasMore: boolean, steps: number }} state
 */
export function shouldWalkEmptyWindow(state) {
  if (state.addedVisible > 0) return false;
  if (state.steps >= FEED_MORE_STEPS) return false;
  return state.serverHasMore || state.freshCount > 0;
}

/**
 * 12h, depois 24h. Sem posts na janela → ainda busca o lote `before` sem teto.
 * @param {number} hours
 */
export function nextMoreHours(hours) {
  const current = Number(hours) || 0;
  const next = FEED_MORE_HOUR_STEPS.find((step) => step > current);
  return next ?? 0;
}

/**
 * @param {{ addedVisible: number, hours: number, unboundedTried: boolean, unboundedCount: number }} state
 */
export function moreStillOpen(state) {
  if (state.addedVisible > 0) return true;
  if (!state.unboundedTried) return true;
  return state.unboundedCount > 0;
}
