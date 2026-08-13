"use client";

import { useState, useEffect, useCallback, useRef } from "react";

import { useBuyerSession } from "@/hooks/useBuyerSession";
import { urlBase64ToUint8Array, subscriptionMatchesKey } from "@/lib/webPush";

export type NotificationPermission = "default" | "granted" | "denied";

/* The buyer-facing counterpart to usePushNotifications (vendor) — same
 * subscribe/unsubscribe/self-heal mechanics (same VAPID key, same service
 * worker, see src/app/api/sw/route.ts's shared push handler), pointed at
 * /api/buyer-push/* instead of /api/push/*. Deliberately does NOT replicate
 * the vendor hook's install-banner/delay-timer/dismiss-cooldown/Transsion-
 * battery-tip machinery — that's product-specific onboarding polish built
 * up over real usage on the vendor dashboard, not something to presume onto
 * the buyer app. This is just the subscription mechanics; BuyerNotificationBell
 * owns the (much simpler) opt-in UI on top of it. */
export function useBuyerPushNotifications() {
  const { buyer } = useBuyerSession();
  // Lazy-initialized, not effect-set — both are synchronous browser-API
  // reads with no external system to subscribe to, so there's nothing an
  // effect would actually be doing here beyond a same-render setState
  // (which is also just a cascading re-render for no reason).
  const [isSupported] = useState(
    () =>
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window,
  );
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof window !== "undefined" && "Notification" in window
      ? (Notification.permission as NotificationPermission)
      : "default",
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const resyncedRef = useRef(false);

  // The one genuinely async check — whether a subscription already exists
  // — stays in an effect, setting state from its own .then() callback
  // rather than synchronously in the effect body.
  useEffect(() => {
    if (!isSupported) return;
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => setIsSubscribed(!!sub));
    });
  }, [isSupported]);

  // Self-heal, same reasoning as the vendor hook's own resyncSubscription:
  // repair a subscription the browser dropped/rotated while the buyer was
  // away, or that the backend pruned after a dead-endpoint push. Only runs
  // once permission is already granted — never prompts on its own.
  const resyncSubscription = useCallback(async () => {
    if (!isSupported || !buyer?.id) return;
    if (Notification.permission !== "granted") return;
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();

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
      const res = await fetch("/api/buyer-push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (res.ok) setIsSubscribed(true);
    } catch {
      /* best-effort resync — leave UI state as-is on failure */
    }
  }, [isSupported, buyer?.id]);

  useEffect(() => {
    if (resyncedRef.current) return;
    resyncedRef.current = true;
    resyncSubscription();
    const onVisible = () => {
      if (document.visibilityState === "visible") resyncSubscription();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [resyncSubscription]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !buyer?.id) return;
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

      const existing = await reg.pushManager.getSubscription();
      if (existing && !subscriptionMatchesKey(existing, vapidKey)) {
        await existing.unsubscribe();
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const res = await fetch("/api/buyer-push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!res.ok) {
        throw new Error(`Subscribe request failed: ${res.status}`);
      }

      setIsSubscribed(true);
    } catch (err) {
      console.error("Buyer push subscription failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, buyer?.id]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported || !buyer?.id) return;
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();

      await fetch("/api/buyer-push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      setIsSubscribed(false);
    } catch (err) {
      console.error("Buyer push unsubscribe failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, buyer?.id]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  };
}
