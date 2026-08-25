/** Agrupa posts da mesma seção por título próximo ou URL canônico. */

export const CLUSTER_WINDOW_MS = 4 * 60 * 60 * 1000;
export const CLUSTER_JACCARD = 0.45;

const STOP = new Set([
  "the",
  "and",
  "for",
  "from",
  "with",
  "this",
  "that",
  "com",
  "uma",
  "para",
  "que",
  "nao",
  "por",
  "dos",
  "das",
  "del",
  "uma",
  "mais",
  "sobre",
]);

function norm(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function headlineTokens(title) {
  return norm(title)
    .split(" ")
    .filter((word) => word.length > 2 && !STOP.has(word));
}

export function jaccard(a, b) {
  const left = new Set(headlineTokens(a));
  const right = new Set(headlineTokens(b));
  if (!left.size || !right.size) return 0;
  let inter = 0;
  for (const token of left) if (right.has(token)) inter += 1;
  return inter / (left.size + right.size - inter);
}

export function canonicalUrl(url) {
  try {
    const parsed = new URL(String(url || ""));
    parsed.hash = "";
    parsed.hostname = parsed.hostname.replace(/^www\./i, "");
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^utm_/i.test(key) || key === "fbclid" || key === "gclid") {
        parsed.searchParams.delete(key);
      }
    }
    parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}${parsed.search}`;
  } catch {
    return "";
  }
}

function richer(a, b) {
  const score = (story) =>
    (story.image ? 4 : 0) +
    (String(story.title || "").length > 20 ? 2 : 0) +
    (String(story.body || "").length > String(story.title || "").length ? 2 : 0) +
    (String(story.url || "").startsWith("http") ? 1 : 0);
  return score(b) > score(a) ? b : a;
}

function titleMatches(story, cluster) {
  if (jaccard(story.title, cluster.head.title) >= CLUSTER_JACCARD) return true;
  return cluster.members.some((member) => jaccard(story.title, member.title) >= CLUSTER_JACCARD);
}

/**
 * @param {Array<Record<string, unknown>>} stories
 * @param {number} [now]
 */
export function clusterStories(stories, now = Date.now()) {
  void now;
  const sorted = [...(Array.isArray(stories) ? stories : [])].sort(
    (a, b) => +new Date(String(b.publishedAt || "")) - +new Date(String(a.publishedAt || "")),
  );
  /** @type {Array<{ section: string, head: any, members: any[], publishedAt: string, latest: string, canons: Set<string> }>} */
  const open = [];
  for (const story of sorted) {
    const at = Date.parse(String(story.publishedAt || ""));
    const section = String(story.category || "");
    const canon = canonicalUrl(String(story.url || ""));
    let hit = null;
    for (const cluster of open) {
      if (cluster.section !== section) continue;
      const latest = Date.parse(cluster.latest);
      if (!Number.isFinite(at) || !Number.isFinite(latest)) continue;
      if (Math.abs(at - latest) > CLUSTER_WINDOW_MS) continue;
      const urlHit = Boolean(canon) && cluster.canons.has(canon);
      if (urlHit || titleMatches(story, cluster)) {
        hit = cluster;
        break;
      }
    }
    if (!hit) {
      open.push({
        section,
        head: story,
        members: [story],
        publishedAt: String(story.publishedAt || ""),
        latest: String(story.publishedAt || ""),
        canons: new Set(canon ? [canon] : []),
      });
      continue;
    }
    hit.members.push(story);
    hit.head = richer(hit.head, story);
    if (at > Date.parse(hit.latest)) hit.latest = String(story.publishedAt || "");
    if (at > Date.parse(hit.publishedAt)) hit.publishedAt = String(story.publishedAt || "");
    if (canon) hit.canons.add(canon);
  }
  return open.map((cluster) => {
    const oldest = [...cluster.members].sort(
      (a, b) => +new Date(String(a.publishedAt || "")) - +new Date(String(b.publishedAt || "")),
    )[0];
    return {
      id: String(oldest?.id || cluster.head.id),
      head: cluster.head,
      members: cluster.members,
      publishedAt: cluster.publishedAt,
    };
  });
}

/** Heads do feed com chrome de cluster. Catalog filter deve ter rodado antes. */
export function attachClusterChrome(stories) {
  return clusterStories(stories).map((cluster) => ({
    ...cluster.head,
    clusterId: cluster.id,
    memberIds: cluster.members.map((row) => String(row.id)),
    alsoFrom: cluster.members
      .filter((row) => row.id !== cluster.head.id)
      .map((row) => ({
        source: String(row.source || ""),
        sourceLabel: String(row.sourceLabel || row.source || ""),
      })),
  }));
}
