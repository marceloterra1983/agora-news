const PUSH_HOSTS = [
  "fcm.googleapis.com",
  "push.services.mozilla.com",
  "notify.windows.com",
  "push.apple.com",
];

/** @param {unknown} value */
export function validPushEndpoint(value) {
  if (typeof value !== "string" || !value || value.length > 2048) return false;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443")
    ) {
      return false;
    }
    const host = url.hostname.toLowerCase();
    return PUSH_HOSTS.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`),
    );
  } catch {
    return false;
  }
}

/**
 * @param {{ endpoint: string, keys?: { p256dh?: string, auth?: string }, handles?: string[] }} sub
 */
export function cleanSub(sub) {
  if (
    !sub ||
    !validPushEndpoint(sub.endpoint) ||
    !sub.keys?.p256dh ||
    !sub.keys.auth ||
    sub.keys.p256dh.length > 512 ||
    sub.keys.auth.length > 512
  ) {
    return null;
  }
  const handles = [
    ...new Set(
      (sub.handles || [])
        .map((handle) => String(handle).replace(/^@+/, "").trim().toLowerCase())
        .filter((handle) => /^[a-z0-9_]{1,15}$|^[ry]_[a-f0-9]{12}$|^uc[a-z0-9_-]{22}$/.test(handle)),
    ),
  ].slice(0, 100);
  return { endpoint: sub.endpoint, keys: sub.keys, handles };
}
