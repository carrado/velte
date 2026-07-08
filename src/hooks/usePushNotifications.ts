"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useUserStore } from "@/store/userStore";
import { useIsInstalled } from "@/hooks/useIsInstalled";
import { useIsStandalone } from "@/hooks/useIsStandalone";

export type NotificationPermission = "default" | "granted" | "denied";

// Persists across sessions — when the user last dismissed (X or "Not now"/
// "Skip", both count the same) — drives the 36h cooldown below.
const SKIPPED_AT_KEY = "push-banner-skipped-at";
// sessionStorage, not localStorage — cleared each time the browser/tab is
// fully closed, so "5 minutes after every login" restarts each fresh
// session instead of only ever counting from the very first visit.
const SESSION_STARTED_KEY = "push-banner-session-started";
const WAS_INSTALLED_KEY = "pwa-was-installed";

// Two mutually exclusive timing rules, decided by whether the user has ever
// dismissed the banner:
//  - Never dismissed: wait 5 minutes after this session/login starts.
//  - Previously dismissed: wait 36 hours after that dismissal instead —
//    replaces the 5-minute rule entirely until the cooldown clears, at which
//    point the banner is due immediately (no extra 5-minute wait on top).
const LOGIN_DELAY_MS = 30 * 1000;
const SKIP_COOLDOWN_MS = 36 * 60 * 60 * 1000;

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0))).buffer;
}

// True if the existing subscription was created with the same VAPID key we sign
// with now. A subscription bound to a ROTATED (old) key 403s forever on the
// backend ("VAPID credentials do not correspond to the credentials used to
// create the subscriptions") and gets pruned then re-added in an endless loop —
// so we must detect the mismatch and force a fresh subscribe. When the browser
// doesn't expose options.applicationServerKey we can't compare, so we assume a
// match to avoid needlessly churning the subscription on every load.
function subscriptionMatchesKey(
  sub: PushSubscription,
  vapidKey: string,
): boolean {
  const existing = sub.options.applicationServerKey;
  if (!existing) return true;
  const current = new Uint8Array(urlBase64ToUint8Array(vapidKey));
  const a = new Uint8Array(existing);
  if (a.length !== current.length) return false;
  return a.every((byte, i) => byte === current[i]);
}

// Resets the promotion cycle — called on uninstall detection.
function resetInstallCycle() {
  localStorage.removeItem(WAS_INSTALLED_KEY);
  localStorage.removeItem(SKIPPED_AT_KEY);
  sessionStorage.removeItem(SESSION_STARTED_KEY);
}

// Returns how long to wait (ms) before the banner is next due — picks
// whichever timing rule applies (see the constants above) and creates
// whatever timestamp it needs on first read.
function computeRemainingDelayMs(): number {
  const skippedAtRaw = localStorage.getItem(SKIPPED_AT_KEY);
  if (skippedAtRaw) {
    const elapsed = Date.now() - parseInt(skippedAtRaw, 10);
    return Math.max(0, SKIP_COOLDOWN_MS - elapsed);
  }

  let sessionStart = sessionStorage.getItem(SESSION_STARTED_KEY);
  if (!sessionStart) {
    sessionStart = Date.now().toString();
    sessionStorage.setItem(SESSION_STARTED_KEY, sessionStart);
  }
  const elapsed = Date.now() - parseInt(sessionStart, 10);
  return Math.max(0, LOGIN_DELAY_MS - elapsed);
}

export function usePushNotifications() {
  const user = useUserStore((s) => s.user);
  const isInstalled = useIsInstalled();
  const isStandalone = useIsStandalone();
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [delayPassed, setDelayPassed] = useState(false);
  // Holds the cleanup for whatever delay timer is currently armed, so
  // re-arming (on dismiss, or on uninstall detection below) never leaks a
  // stale timeout still pending from before.
  const clearDelayTimerRef = useRef<() => void>(() => {});

  const armDelayTimer = useCallback(() => {
    clearDelayTimerRef.current();
    const remaining = computeRemainingDelayMs();
    if (remaining === 0) {
      setDelayPassed(true);
      clearDelayTimerRef.current = () => {};
      return;
    }
    setDelayPassed(false);
    const timer = setTimeout(() => setDelayPassed(true), remaining);
    clearDelayTimerRef.current = () => clearTimeout(timer);
  }, []);

  // Mount: resolve all state from browser APIs + localStorage/sessionStorage
  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window;
    setIsSupported(supported);
    if (!supported) return;

    setPermission(Notification.permission as NotificationPermission);

    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => setIsSubscribed(!!sub));
    });

    armDelayTimer();
    return () => clearDelayTimerRef.current();
  }, [armDelayTimer]);

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
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();

    // Stale-key repair: a subscription created with a rotated VAPID key can't be
    // pushed to (backend 403), so drop it and let the block below re-create it
    // with the current key. This is what makes a key rotation self-correct on
    // the next app open instead of looping forever.
    if (sub && !subscriptionMatchesKey(sub, vapidKey)) {
      try {
        await sub.unsubscribe();
      } catch {
        /* ignore — subscribe() below replaces it regardless */
      }
      sub = null;
    }

    if (!sub) {
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
  // can appear again after the 5-minute (never-skipped) delay.
  useEffect(() => {
    const handle = () => {
      if (localStorage.getItem(WAS_INSTALLED_KEY) !== "1") return;
      resetInstallCycle();
      armDelayTimer();
    };

    window.addEventListener("beforeinstallprompt", handle);
    return () => window.removeEventListener("beforeinstallprompt", handle);
  }, [armDelayTimer]);

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

      // A subscription bound to a different (rotated) key must be removed first —
      // subscribe() rejects with InvalidStateError if one already exists with a
      // mismatched applicationServerKey.
      const existing = await reg.pushManager.getSubscription();
      if (existing && !subscriptionMatchesKey(existing, vapidKey)) {
        await existing.unsubscribe();
      }

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

  // X and "Not now"/"Skip" both call this (see PushNotificationManager) —
  // deliberately the same action, both starting the 36-hour cooldown.
  // Re-arms the timer immediately (rather than waiting for a future mount)
  // so a tab left open past the 36h mark still flips delayPassed on its own.
  const dismiss = useCallback(() => {
    localStorage.setItem(SKIPPED_AT_KEY, Date.now().toString());
    armDelayTimer();
  }, [armDelayTimer]);

  // Two mutually exclusive nudges sharing one cooldown/delay: push notifications
  // are unreliable (or on iOS Safari, entirely unavailable) outside an installed,
  // standalone PWA — so ask to install FIRST, and only ask for alert permission
  // once the app is actually RUNNING standalone (isStandalone), not merely once
  // installed (isInstalled flips true the moment the browser's install prompt is
  // accepted, even though that same tab is still ordinary browser chrome — the
  // alerts ask must wait for the user to actually open the installed app, not
  // fire right there in the browser). isInstalled hides the install banner
  // immediately once accepted either way, so the two nudges never overlap.
  const showInstallBanner =
    isSupported &&
    delayPassed &&
    permission === "default" &&
    !isSubscribed &&
    !isInstalled &&
    !!user;

  const showAlertsBanner =
    isSupported &&
    delayPassed &&
    permission === "default" &&
    !isSubscribed &&
    isStandalone &&
    !!user;

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    showInstallBanner,
    showAlertsBanner,
    subscribe,
    unsubscribe,
    dismiss,
  };
}
