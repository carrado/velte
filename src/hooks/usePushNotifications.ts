"use client";

import { useState, useEffect, useCallback } from "react";
import { useUserStore } from "@/store/userStore";

export type NotificationPermission = "default" | "granted" | "denied";

const DISMISSED_KEY = "push-notification-dismissed";
const FIRST_VISIT_KEY = "push-banner-first-visit";
const WAS_INSTALLED_KEY = "pwa-was-installed";

const BANNER_DELAY_MS = 5 * 60 * 1000; // 5 minutes before first prompt
const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours after "Not now"

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0))).buffer;
}

// Resets the promotion cycle — called on uninstall detection.
function resetInstallCycle() {
  localStorage.removeItem(WAS_INSTALLED_KEY);
  localStorage.removeItem(DISMISSED_KEY);
  localStorage.removeItem(FIRST_VISIT_KEY);
}

// Returns how long to wait (ms) before showing the banner.
// If the first-visit timestamp doesn't exist yet it is created here.
function getBannerDelay(): number {
  let stored = localStorage.getItem(FIRST_VISIT_KEY);
  if (!stored) {
    stored = Date.now().toString();
    localStorage.setItem(FIRST_VISIT_KEY, stored);
  }
  const elapsed = Date.now() - parseInt(stored, 10);
  return Math.max(0, BANNER_DELAY_MS - elapsed);
}

// Returns true if the user dismissed within the 24-hour cooldown window.
function isDismissedRecently(): boolean {
  const raw = localStorage.getItem(DISMISSED_KEY);
  if (!raw) return false;
  const elapsed = Date.now() - parseInt(raw, 10);
  if (elapsed >= DISMISS_COOLDOWN_MS) {
    localStorage.removeItem(DISMISSED_KEY);
    return false;
  }
  return true;
}

export function usePushNotifications() {
  const user = useUserStore((s) => s.user);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [delayPassed, setDelayPassed] = useState(false);

  // Mount: resolve all state from browser APIs + localStorage
  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window;
    setIsSupported(supported);
    if (!supported) return;

    setPermission(Notification.permission as NotificationPermission);
    setIsDismissed(isDismissedRecently());

    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => setIsSubscribed(!!sub));
    });

    const remaining = getBannerDelay();
    if (remaining === 0) {
      setDelayPassed(true);
      return;
    }
    const timer = setTimeout(() => setDelayPassed(true), remaining);
    return () => clearTimeout(timer);
  }, []);

  // Self-heal: with permission already granted, make sure a live subscription
  // exists AND the backend has it. Two desyncs to repair:
  //  1. Browser holds a subscription but the backend pruned its row (a web-push
  //     410 deletes server-side while the browser keeps the object) — re-POST it.
  //  2. The browser dropped the subscription entirely (410/rotation/cleared data)
  //     and pushsubscriptionchange never fired because the app wasn't open — so
  //     getSubscription() is null. Re-create it (subscribe needs no gesture once
  //     permission is granted), otherwise the device has no endpoint at all.
  // Idempotent: the backend upserts by endpoint, and a dead endpoint just 410s
  // again and gets pruned.
  const resyncSubscription = useCallback(async () => {
    if (!isSupported || !user?.id) return;
    if (Notification.permission !== "granted") return;
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return;
      try {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
      } catch {
        return; // can't re-create (e.g. offline) — try again next time
      }
    }
    try {
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, subscription: sub.toJSON() }),
      });
      if (res.ok) setIsSubscribed(true);
    } catch {
      /* best-effort resync — leave UI state as-is on failure */
    }
  }, [isSupported, user?.id]);

  // Run the repair on mount (cold launch) AND every time the app returns to the
  // foreground. A resumed-from-background PWA doesn't reload, so the mount run
  // alone would miss a subscription the browser rotated or dropped while we were
  // backgrounded; the visibilitychange re-run closes that window.
  useEffect(() => {
    resyncSubscription();
    const onVisible = () => {
      if (document.visibilityState === "visible") resyncSubscription();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [resyncSubscription]);

  // Uninstall detection: beforeinstallprompt fires again after the user
  // removes the PWA. If we had recorded a successful install, treat this as
  // an uninstall event and reset the whole promotion cycle so the banner
  // can appear again after the 5-minute delay.
  useEffect(() => {
    const handle = () => {
      if (localStorage.getItem(WAS_INSTALLED_KEY) !== "1") return;
      resetInstallCycle();
      setIsDismissed(false);
      setDelayPassed(false);
      // Start a fresh 5-minute timer
      const timer = setTimeout(() => setDelayPassed(true), BANNER_DELAY_MS);
      return () => clearTimeout(timer);
    };

    window.addEventListener("beforeinstallprompt", handle);
    return () => window.removeEventListener("beforeinstallprompt", handle);
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported || !user?.id) return;
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.error("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set");
        return;
      }

      const perm = await Notification.requestPermission();
      setPermission(perm as NotificationPermission);
      if (perm !== "granted") return;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, subscription: sub.toJSON() }),
      });
      if (!res.ok) {
        // The browser subscription exists but the backend didn't persist it —
        // don't claim success, or notifyUser will have nothing to push to.
        throw new Error(`Subscribe request failed: ${res.status}`);
      }

      setIsSubscribed(true);
    } catch (err) {
      console.error("Push subscription failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user?.id]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported || !user?.id) return;
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();

      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      setIsSubscribed(false);
    } catch (err) {
      console.error("Unsubscribe failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user?.id]);

  // Stores a timestamp so the cooldown check (isDismissedRecently) can
  // expire it after 24 hours and re-show the banner automatically.
  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
    setIsDismissed(true);
  }, []);

  const showBanner =
    isSupported &&
    delayPassed &&
    permission === "default" &&
    !isDismissed &&
    !isSubscribed &&
    !!user;

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    showBanner,
    subscribe,
    unsubscribe,
    dismiss,
  };
}
