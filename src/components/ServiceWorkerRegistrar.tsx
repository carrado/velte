"use client";

import { useEffect } from "react";
import { installPromptStore } from "@/lib/installPromptStore";

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    // Capture beforeinstallprompt here (root layout) so it's available
    // to PushNotificationManager even though it's lazily loaded later.
    window.addEventListener("beforeinstallprompt", installPromptStore.capture);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/api/sw", { scope: "/" })
        .catch(() => {});
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        installPromptStore.capture,
      );
    };
  }, []);

  return null;
}
