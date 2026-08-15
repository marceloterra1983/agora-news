const KEY = "agora-profile-interests-v1";

function norm(h: string): string {
  return String(h || "")
    .replace(/^@+/, "")
    .trim()
    .replace(/\s+/g, "");
}

export function loadInterests(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return [
      ...new Set(
        parsed
          .map((x) => norm(String(x)))
          .filter((h) => /^[A-Za-z0-9_]{1,15}$/.test(h)),
      ),
    ];
  } catch {
    return [];
  }
}

export function saveInterest(handle: string): string[] {
  const h = norm(handle);
  if (!h) return loadInterests();
  const next = [h, ...loadInterests().filter((x) => x.toLowerCase() !== h.toLowerCase())];
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("agora-profile-interests"));
  return next;
}

export function removeInterest(handle: string): string[] {
  const h = norm(handle).toLowerCase();
  const next = loadInterests().filter((x) => x.toLowerCase() !== h);
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("agora-profile-interests"));
  return next;
}

export function hasInterest(handle: string): boolean {
  const h = norm(handle).toLowerCase();
  return loadInterests().some((x) => x.toLowerCase() === h);
}
