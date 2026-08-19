import { getNotifyHandles, normHandle, setNotifyHandle } from "./fontes-prefs";
import {
  applyPushSubscribeResult,
  ensureCurrentPushSubscription,
} from "./notify-core.mjs";
import type { Story } from "./types";

const ENABLED_KEY = "agora-notify-fav-v1";
const SEEN_KEY = "agora-notify-seen-v1";
const READY_KEY = "agora-notify-ready-v1";
const EVENT = "agora-notify-fav";

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT));
}

async function readyRegistration(ms = 2500) {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("sw_ready_timeout")), ms);
    }),
  ]);
}

export function notifySupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function isNotifyEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ENABLED_KEY) === "1";
}

export function notifyPermission(): NotificationPermission | "unsupported" {
  if (!notifySupported()) return "unsupported";
  return Notification.permission;
}

function readSeen(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

function writeSeen(ids: Set<string>) {
  if (typeof window === "undefined") return;
  const list = [...ids].slice(-400);
  window.localStorage.setItem(SEEN_KEY, JSON.stringify(list));
}

function seedSeen(stories: Story[]) {
  const seen = readSeen();
  for (const s of stories) if (s.id) seen.add(s.id);
  writeSeen(seen);
  window.localStorage.setItem(READY_KEY, "1");
}

export async function enableFavoriteNotify(handles = getNotifyHandles()): Promise<
  NotificationPermission | "unsupported" | "error"
> {
  if (!notifySupported()) return "unsupported";
  try {
    const perm =
      Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
    if (perm !== "granted") return perm;
    window.localStorage.setItem(ENABLED_KEY, "1");
    window.localStorage.removeItem(READY_KEY);
    emit();
    void subscribeWebPush(handles);
    return perm;
  } catch {
    return "error";
  }
}

export async function disableFavoriteNotify() {
  if (typeof window === "undefined") return "error" as const;
  if (!(await unsubscribeWebPush())) return "error" as const;
  window.localStorage.setItem(ENABLED_KEY, "0");
  emit();
  return "off" as const;
}

export async function toggleFavoriteNotify(): Promise<
  NotificationPermission | "unsupported" | "off" | "error"
> {
  if (isNotifyEnabled()) {
    return disableFavoriteNotify();
  }
  return enableFavoriteNotify();
}

function isFresh(iso: string): boolean {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < 6 * 60 * 60 * 1000;
}

export function newFavoriteStories(stories: Story[]): Story[] {
  if (!isNotifyEnabled() || notifyPermission() !== "granted") return [];
  const watched = new Set(getNotifyHandles());
  if (!watched.size) return [];
  const favs = stories.filter((s) =>
    watched.has(normHandle(s.source || s.sourceLabel || "")),
  );
  if (typeof window === "undefined") return [];
  if (window.localStorage.getItem(READY_KEY) !== "1") {
    seedSeen(favs);
    return [];
  }
  const seen = readSeen();
  const fresh = favs.filter(
    (s) => s.id && !seen.has(s.id) && isFresh(s.publishedAt),
  );
  for (const s of fresh) seen.add(s.id);
  if (fresh.length) writeSeen(seen);
  return fresh.slice(0, 3);
}

export async function showFavoriteAlerts(stories: Story[]): Promise<number> {
  const incoming = newFavoriteStories(stories);
  if (!incoming.length) return 0;
  let shown = 0;
  for (const story of incoming) {
    const title = story.sourceLabel || `@${story.source}`;
    const body = story.title.slice(0, 140);
    const url = `/materia/${encodeURIComponent(story.id)}`;
    try {
      if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.showNotification(title, {
            body,
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
            tag: `fav-${story.id}`,
            data: { url },
          });
          shown += 1;
          continue;
        }
      }
      new Notification(title, { body, icon: "/icons/icon-192.png" });
      shown += 1;
    } catch {
      // permission revoked mid-flight
    }
  }
  return shown;
}

export function subscribeNotify(fn: () => void) {
  if (typeof window === "undefined") return () => {};
  const on = () => fn();
  window.addEventListener(EVENT, on);
  return () => window.removeEventListener(EVENT, on);
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function subscribeWebPush(handles = getNotifyHandles()) {
  if (
    typeof window === "undefined" ||
    typeof navigator === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return false;
  }
  try {
    const keyResponse = await fetch("/api/push", { cache: "no-store" });
    if (!keyResponse.ok) return false;
    const { key } = (await keyResponse.json()) as { key?: string };
    if (!key) return false;
    const reg = await readyRegistration();
    const { subscription: sub, replacedEndpoint } =
      await ensureCurrentPushSubscription(
        reg.pushManager,
        urlBase64ToUint8Array(key),
      );
    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return false;
    const res = await fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        handles,
      }),
    });
    const saved = applyPushSubscribeResult(res.ok);
    if (saved && replacedEndpoint && replacedEndpoint !== json.endpoint) {
      await fetch("/api/push", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: replacedEndpoint }),
      });
    }
    return saved;
  } catch {
    return false;
  }
}

export async function setFavoriteNotifyHandle(handle: string, on: boolean) {
  const key = normHandle(handle);
  if (!key) return "error" as const;
  const current = getNotifyHandles();
  const next = on
    ? [...new Set([...current, key])]
    : current.filter((item) => item !== key);
  if (current.includes(key) === on) return "granted" as const;
  setNotifyHandle(key, on);
  if (on) await enableFavoriteNotify(next);
  else if (isNotifyEnabled()) void subscribeWebPush(next);
  return "granted" as const;
}

export async function reconcileFavoritePush() {
  if (!isNotifyEnabled() || notifyPermission() !== "granted") return;
  await subscribeWebPush();
}

export async function unsubscribeWebPush() {
  if (
    typeof navigator === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return false;
  }
  try {
    const reg = await readyRegistration();
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return true;
    if (!sub.endpoint) return false;
    const response = await fetch("/api/push", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
    if (!response.ok) return false;
    return sub.unsubscribe();
  } catch {
    return false;
  }
}
