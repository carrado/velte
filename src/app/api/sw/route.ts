import { NextResponse } from "next/server";

// Served at /sw.js via the beforeFiles rewrite in next.config.ts.
// Route handlers bypass Next.js's dev-server JS pipeline so the browser
// receives the file without any redirect.
const SW = `const CACHE_NAME = "velte-cache-v1";
const VAPID_PUBLIC_KEY = "${process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

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
    icon: data.icon || "/velte_manifest.png",
    badge: data.badge || "/velte_manifest.png",
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

self.addEventListener("pushsubscriptionchange", (event) => {
  // The browser rotated or expired this subscription (Chrome key rotation, a
  // web-push 410, cleared site data, etc.). If we don't re-subscribe and
  // re-register right now, the backend row 410s and gets pruned, leaving this
  // device with no endpoint — push then silently stops until the next app open.
  // Re-subscribing here needs no user gesture and no auth prompt; the POST to
  // /api/push/subscribe rides the existing same-origin auth cookie.
  event.waitUntil(
    (async () => {
      try {
        const sub =
          event.newSubscription ||
          (await self.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          }));
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: sub.toJSON() }),
        });
      } catch (err) {
        // Best-effort — the app-load self-heal retries on next open.
      }
    })(),
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
