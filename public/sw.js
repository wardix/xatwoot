// Service Worker for Browser Web Push Notifications — VS-FRONTEND-004

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title ?? "New Message — Xatwoot";
    const options = {
      body: payload.body ?? "You have received a new message.",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      data: {
        url: payload.url ?? "/inbox",
        conversationId: payload.conversationId,
      },
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error("Push event parsing failed:", err);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? "/inbox";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
