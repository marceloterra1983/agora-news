const READ_KEY = "agora-read-ids-v1";
const BASELINE_KEY = "agora-seen-baseline-v1";
export const SINCE_KEY = "agora-unread-since-v1";
const EVENT = "agora-unread";
const CAP = 500;

export const UNREAD_TTL_MS = 12 * 60 * 60 * 1000;
export const IMPRESSION_MS = 1500;
export const IMPRESSION_RATIO = 0.5;

export type UnreadNowInput = {
  hasBaseline: boolean;
  inRead: boolean;
  inBaseline: boolean;
  firstUnreadAt: number | null;
  now: number;
  ttlMs?: number;
};

export type ImpressionInput = {
  ratio: number;
  visible: boolean;
  elapsedMs: number;
  ratioMin?: number;
  dwellMs?: number;
};

export function isUnreadNow({
  hasBaseline,
  inRead,
  inBaseline,
  firstUnreadAt,
  now,
  ttlMs = UNREAD_TTL_MS,
}: UnreadNowInput): boolean {
  if (!hasBaseline || inRead || inBaseline) return false;
  if (
    firstUnreadAt != null &&
    now >= firstUnreadAt &&
    now - firstUnreadAt >= ttlMs
  ) {
    return false;
  }
  return true;
}

export function impressionReady({
  ratio,
  visible,
  elapsedMs,
  ratioMin = IMPRESSION_RATIO,
  dwellMs = IMPRESSION_MS,
}: ImpressionInput): boolean {
  return visible && ratio >= ratioMin && elapsedMs >= dwellMs;
}

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT));
}

function readSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(key);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(arr) ? arr.map(String).filter(Boolean) : []);
  } catch {
    return new Set();
  }
}

function writeSet(key: string, set: Set<string>) {
  if (typeof window === "undefined") return;
  const list = [...set].slice(-CAP);
  try {
    window.localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* quota */
  }
}

function readSince(): Map<string, number> {
  if (typeof window === "undefined") return new Map();
  try {
    const raw = window.localStorage.getItem(SINCE_KEY);
    const obj = raw ? (JSON.parse(raw) as unknown) : {};
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return new Map();
    const map = new Map<string, number>();
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const at = Number(value);
      if (key && Number.isFinite(at)) map.set(String(key), at);
    }
    return map;
  } catch {
    return new Map();
  }
}

function writeSince(map: Map<string, number>) {
  if (typeof window === "undefined") return;
  const kept = [...map.entries()].sort((a, b) => a[1] - b[1]).slice(-CAP);
  try {
    window.localStorage.setItem(
      SINCE_KEY,
      JSON.stringify(Object.fromEntries(kept)),
    );
  } catch {
    /* quota */
  }
}

export function getReadIds(): Set<string> {
  return readSet(READ_KEY);
}

export function getBaselineIds(): Set<string> {
  return readSet(BASELINE_KEY);
}

export function getUnreadSince(): Map<string, number> {
  return readSince();
}

export function hasBaseline(): boolean {
  return getBaselineIds().size > 0;
}

/** First visit: remember the current feed so nothing already on screen looks new. */
export function seedBaseline(ids: string[]) {
  if (typeof window === "undefined" || !ids.length) return;
  if (hasBaseline()) return;
  writeSet(BASELINE_KEY, new Set(ids.map(String)));
  emit();
}

export function noteFirstUnread(ids: string[], now = Date.now()) {
  if (typeof window === "undefined" || !ids.length) return;
  if (!hasBaseline()) return;
  const read = getReadIds();
  const baseline = getBaselineIds();
  const since = getUnreadSince();
  let changed = false;
  for (const raw of ids) {
    const id = String(raw || "");
    if (!id || since.has(id)) continue;
    if (
      !isUnreadNow({
        hasBaseline: true,
        inRead: read.has(id),
        inBaseline: baseline.has(id),
        firstUnreadAt: null,
        now,
      })
    ) {
      continue;
    }
    since.set(id, now);
    changed = true;
  }
  if (!changed) return;
  writeSince(since);
  emit();
}

export function markRead(id: string) {
  if (typeof window === "undefined" || !id) return;
  const read = getReadIds();
  const since = getUnreadSince();
  const alreadyRead = read.has(id);
  const hadSince = since.has(id);
  if (alreadyRead && !hadSince) return;
  if (!alreadyRead) {
    read.add(id);
    writeSet(READ_KEY, read);
  }
  if (hadSince) {
    since.delete(id);
    writeSince(since);
  }
  emit();
}

export function isUnread(id: string, now = Date.now()): boolean {
  if (!id || typeof window === "undefined") return false;
  return isUnreadNow({
    hasBaseline: hasBaseline(),
    inRead: getReadIds().has(id),
    inBaseline: getBaselineIds().has(id),
    firstUnreadAt: getUnreadSince().get(id) ?? null,
    now,
  });
}

export function resetUnread() {
  if (typeof window === "undefined") return;
  writeSet(READ_KEY, new Set());
  writeSet(BASELINE_KEY, new Set());
  writeSince(new Map());
  emit();
}

export function subscribeUnread(fn: () => void) {
  if (typeof window === "undefined") return () => {};
  const on = () => fn();
  window.addEventListener(EVENT, on);
  window.addEventListener("storage", on);
  return () => {
    window.removeEventListener(EVENT, on);
    window.removeEventListener("storage", on);
  };
}
