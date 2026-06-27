import { NextResponse } from "next/server";

// Served at /sw.js via the beforeFiles rewrite in next.config.ts.
// Route handlers bypass Next.js's dev-server JS pipeline so the browser
// receives the file without any redirect.
const SW = `const CACHE_NAME = "velte-cache-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(["/"])));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
    ]),
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "Velte", body: event.data.text() };
  }

  const options = {
    body: data.body || "",
    icon: data.icon || "/velte_logo_esn5dj.png",
    badge: data.badge || "/velte_logo_esn5dj.png",
    tag: data.tag || "velte-notification",
    data: { url: data.url || "/" },
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title || "Velte", options),
      // Nudge any open dashboard tab to refresh its in-app bell immediately,
      // instead of waiting for the next 45s poll.
      self.clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clients) =>
          clients.forEach((c) => c.postMessage({ type: "velte-push" })),
        ),
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(url) && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      }),
  );
});
`;

export async function GET() {
  return new NextResponse(SW, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Service-Worker-Allowed": "/",
      "Cache-Control": "no-store",
    },
  });
}
