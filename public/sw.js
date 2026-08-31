self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "MasaQR", {
      body: payload.body || "Yeni bir bildiriminiz var.",
      icon: "/masaqr-icon.svg",
      badge: "/masaqr-icon.svg",
      tag: payload.tag || "masaqr-staff",
      renotify: true,
      vibrate: [180, 80, 180],
      data: { url: payload.url || "/staff/waiter" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin)
    .href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(
      (clients) => {
        const existing = clients.find((client) => client.url === target);
        if (existing) return existing.focus();
        return self.clients.openWindow(target);
      },
    ),
  );
});
