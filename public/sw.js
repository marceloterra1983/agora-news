/**
 * Push + update. Sem cache de HTML (isso já quebrou o app publicado).
 */
const VERSION = "agora-2026-08-17-v19";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("push", (event) => {
  let data = { title: "Agora", body: "Nova publicação", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* keep default */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/" },
      tag: data.url || VERSION,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client && target) return client.navigate(target);
          return undefined;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
      return undefined;
    }),
  );
});
