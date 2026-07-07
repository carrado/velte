"use client";

import { useEffect, useState } from "react";

const WAS_INSTALLED_KEY = "pwa-was-installed";

// Shared between usePushNotifications (gates the initial nudge) and
// PushNotificationManager's own install-prompt flow — both need to know
// whether the PWA is already installed, independently of each other.
export function useIsInstalled() {
  const [isInstalled, setIsInstalled] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(display-mode: standalone)").matches,
  );

  useEffect(() => {
    if (isInstalled) return;
    const onInstalled = () => {
      setIsInstalled(true);
      localStorage.setItem(WAS_INSTALLED_KEY, "1");
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, [isInstalled]);

  return isInstalled;
}
