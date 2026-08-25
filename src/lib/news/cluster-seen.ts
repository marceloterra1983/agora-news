export const CLUSTER_SEEN_KEY = "agora-cluster-seen-v1";
const CAP = 200;

export function freshMemberCount(seenIds: string[] | undefined, memberIds: string[]): number {
  if (!seenIds) return 0;
  const known = new Set(seenIds);
  return memberIds.filter((id) => id && !known.has(id)).length;
}

export function readClusterSeen(storage?: Storage | null): Record<string, string[]> {
  const store = storage ?? (typeof window === "undefined" ? null : window.localStorage);
  if (!store) return {};
  try {
    const raw = store.getItem(CLUSTER_SEEN_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).map(([id, members]) => [
        id,
        Array.isArray(members) ? members.map(String) : [],
      ]),
    );
  } catch {
    return {};
  }
}

export function markClusterSeen(
  clusterId: string,
  memberIds: string[],
  storage?: Storage | null,
): void {
  const id = String(clusterId || "").trim();
  if (!id) return;
  const store = storage ?? (typeof window === "undefined" ? null : window.localStorage);
  if (!store) return;
  const next = readClusterSeen(store);
  next[id] = [...new Set(memberIds.map(String).filter(Boolean))];
  const keys = Object.keys(next);
  if (keys.length > CAP) {
    for (const extra of keys.slice(0, keys.length - CAP)) delete next[extra];
  }
  try {
    store.setItem(CLUSTER_SEEN_KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
}

export function freshMemberCountFor(
  clusterId: string,
  memberIds: string[],
  storage?: Storage | null,
): number {
  const seen = readClusterSeen(storage)[clusterId];
  return freshMemberCount(seen, memberIds);
}
