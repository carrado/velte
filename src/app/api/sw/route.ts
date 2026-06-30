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

// A subscription created with a rotated (old) VAPID key 403s forever on the
// backend, so it must be replaced. Returns false when the key differs; true when
// it matches or the browser doesn't expose the key (can't verify — leave as-is).
function subscriptionMatchesKey(sub, vapidKey) {
  const existing = sub.options && sub.options.applicationServerKey;
  if (!existing) return true;
  const current = urlBase64ToUint8Array(vapidKey);
  const a = new Uint8Array(existing);
  if (a.length !== current.length) return false;
  return a.every((byte, i) => byte === current[i]);
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
        let sub =
          event.newSubscription ||
          (await self.registration.pushManager.getSubscription());
        // The replacement the browser hands us (or the one already on record)
        // may still carry the rotated key — drop it so we re-create with ours.
        if (sub && !subscriptionMatchesKey(sub, VAPID_PUBLIC_KEY)) {
          try {
            await sub.unsubscribe();
          } catch {
            /* ignore — subscribe() below replaces it */
          }
          sub = null;
        }
        if (!sub) {
          sub = await self.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
        }
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
  // Resolve to an absolute, same-origin URL so url comparison, navigate() and
  // openWindow() all agree on the target.
  const target = new URL(
    event.notification.data?.url || "/",
    self.location.origin,
  ).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // 1. A window already on the target page — just focus it (no reload).
        for (const client of clientList) {
          if (client.url === target && "focus" in client) {
            return client.focus();
          }
        }
        // 2. Any open app window — focus the installed PWA and steer it to the
        //    order, instead of spawning a second window/tab.
        for (const client of clientList) {
          if ("focus" in client) {
            return client.focus().then((c) => {
              if (c && "navigate" in c) {
                return c.navigate(target).catch(() => c);
              }
              return c;
            });
          }
        }
        // 3. Nothing open — launch the PWA at the target.
        if (self.clients.openWindow) {
          return self.clients.openWindow(target);
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
