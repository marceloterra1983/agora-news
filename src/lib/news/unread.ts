const READ_KEY = "agora-read-ids-v1";
const BASELINE_KEY = "agora-seen-baseline-v1";
const EVENT = "agora-unread";
const CAP = 500;

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

export function getReadIds(): Set<string> {
  return readSet(READ_KEY);
}

export function getBaselineIds(): Set<string> {
  return readSet(BASELINE_KEY);
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

export function markRead(id: string) {
  if (typeof window === "undefined" || !id) return;
  const read = getReadIds();
  if (read.has(id)) return;
  read.add(id);
  writeSet(READ_KEY, read);
  emit();
}

export function isUnread(id: string): boolean {
  if (!id || typeof window === "undefined") return false;
  if (!hasBaseline()) return false;
  if (getReadIds().has(id)) return false;
  if (getBaselineIds().has(id)) return false;
  return true;
}

export function resetUnread() {
  if (typeof window === "undefined") return;
  writeSet(READ_KEY, new Set());
  writeSet(BASELINE_KEY, new Set());
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
