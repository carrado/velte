import { NextResponse } from "next/server";

// Registered directly at this path (ServiceWorkerRegistrar calls
// navigator.serviceWorker.register("/api/sw", { scope: "/" })) — no /sw.js
// rewrite involved. A route handler works fine as a service worker script as
// long as it's served with the right content-type and Service-Worker-Allowed
// header, both set below.
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
  // Re-subscribing here needs no user gesture and no auth prompt; the POSTs
  // below ride whatever same-origin auth cookies already exist.
  //
  // Vendor push only — buyers have no push subscriptions of their own
  // (2026-08-18). /api/push/subscribe 401s harmlessly if no vendor session
  // is active on this device.
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
        const body = JSON.stringify({ subscription: sub.toJSON() });
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
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

// ── Hub Listings Background Poller ───────────────────────────────────────────
// Runs purely inside the Service Worker thread so it is NOT visible in the
// page context's Fetch/XHR Network tab.
const hubKnownListingIds = new Set();
let hubCheckInProgress = false;

async function checkHubForNewListings() {
  if (hubCheckInProgress) return;
  hubCheckInProgress = true;
  try {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const hasHubClient = clients.some((c) => c.url && c.url.includes("/hub"));
    if (!hasHubClient) return;

    const res = await fetch("/api/hub/home", {
      headers: { "Cache-Control": "no-cache" },
    });
    if (!res.ok) return;
    const data = await res.json();
    const items = Array.isArray(data?.timeline) ? data.timeline : [];
    if (Array.isArray(items) && items.length > 0) {
      if (hubKnownListingIds.size > 0) {
        const newItems = items.filter((item) => item && item.id && !hubKnownListingIds.has(item.id));
        if (newItems.length > 0) {
          for (const item of newItems) {
            if (item && item.id) hubKnownListingIds.add(item.id);
          }
          clients.forEach((c) => {
            if (c.url && c.url.includes("/hub")) {
              c.postMessage({ type: "HUB_NEW_LISTINGS", items: newItems });
            }
          });
        }
      } else {
        items.forEach((item) => {
          if (item && item.id) hubKnownListingIds.add(item.id);
        });
      }
    }
  } catch (err) {
    // Silent background check failure
  } finally {
    hubCheckInProgress = false;
  }
}

// Background check in service worker context every 25 seconds
setInterval(checkHubForNewListings, 25000);

self.addEventListener("message", (event) => {
  if (!event.data) return;
  if (event.data.type === "HUB_SYNC_KNOWN_IDS" && Array.isArray(event.data.ids)) {
    event.data.ids.forEach((id) => hubKnownListingIds.add(id));
  } else if (event.data.type === "HUB_TRIGGER_CHECK") {
    checkHubForNewListings();
  }
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
