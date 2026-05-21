"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bell, BellOff, Download, X } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { cn } from "@/lib/utils";
import { installPromptStore } from "@/lib/installPromptStore";
import type { BeforeInstallPromptEvent } from "@/types/common";

function useInstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Sync whatever ServiceWorkerRegistrar already captured before we mounted.
    const already = installPromptStore.get();
    if (already) setPrompt(already);

    // Subscribe in case it fires after we mount (first visit, slow browser).
    const unsub = installPromptStore.subscribe(() =>
      setPrompt(installPromptStore.get()),
    );

    const onInstalled = () => {
      setIsInstalled(true);
      setPrompt(null);
      installPromptStore.clear();
      localStorage.setItem("pwa-was-installed", "1");
    };

    window.addEventListener("appinstalled", onInstalled);
    return () => {
      unsub();
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return { prompt, isInstalled, canInstall: !!prompt && !isInstalled };
}

export default function PushNotificationManager() {
  const { showBanner, isLoading, subscribe, dismiss } = usePushNotifications();
  const { prompt: installPrompt, canInstall, isInstalled } = useInstallPrompt();
  const [isActioning, setIsActioning] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const sync = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  const handlePrimary = async () => {
    setIsActioning(true);
    try {
      // Show native install dialog first (if available). The user can accept or
      // dismiss it — we proceed with notifications either way.
      if (installPrompt) {
        await installPrompt.prompt();
      }
      await subscribe();
    } finally {
      setIsActioning(false);
    }
  };

  const busy = isActioning || isLoading;

  return (
    <AnimatePresence>
      {showBanner && (
        <>
          {/* Mobile backdrop */}
          <motion.div
            key="pnm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] md:hidden"
            onClick={dismiss}
          />

          {/* Card */}
          <motion.div
            key="pnm-card"
            initial={{ y: isMobile ? -24 : 24, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: isMobile ? -24 : 24, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className={cn(
              "fixed z-50",
              "top-4 left-4 right-4",
              "md:top-auto md:left-auto md:bottom-6 md:right-6 md:w-[380px]",
            )}
          >
            <div className="relative overflow-hidden rounded-2xl bg-white shadow-[0_12px_40px_-8px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.06]">
              {/* Brand stripe */}
              <div className="h-[3px] w-full bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600" />

              {/* Dismiss */}
              <button
                onClick={dismiss}
                aria-label="Dismiss"
                className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="px-5 pb-5 pt-4">
                {/* Header */}
                <div className="mb-4 flex items-center gap-3 pr-6">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-sm shadow-orange-200">
                    <Bell className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-orange-500">
                      Velte
                    </p>
                    <h3 className="text-[15px] font-semibold leading-tight text-slate-900">
                      Get the full experience
                    </h3>
                  </div>
                </div>

                {/* Body */}
                <p className="text-[13px] leading-relaxed text-slate-500">
                  Install Velte on your device and enable notifications to get
                  instant alerts for new orders and messages.
                </p>

                {/* Feature pills — always visible */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-[11px] font-medium text-orange-600 ring-1 ring-orange-100">
                    <Download className="h-3 w-3" />
                    Install app
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-[11px] font-medium text-orange-600 ring-1 ring-orange-100">
                    <Bell className="h-3 w-3" />
                    Push notifications
                  </span>
                </div>

                {/* Actions */}
                <div className="mt-5 flex items-center gap-3">
                  <button
                    onClick={handlePrimary}
                    disabled={busy}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-xl",
                      "bg-orange-500 px-4 py-2.5 text-[13px] font-semibold text-white",
                      "shadow-sm shadow-orange-200/80 transition-all",
                      "hover:bg-orange-600 active:scale-[0.97]",
                      "disabled:cursor-not-allowed disabled:opacity-60",
                    )}
                  >
                    {busy ? (
                      <>
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Enabling…
                      </>
                    ) : (
                      <>
                        <Download className="h-3.5 w-3.5" />
                        Install &amp; enable alerts
                      </>
                    )}
                  </button>

                  <button
                    onClick={dismiss}
                    className="shrink-0 text-[13px] font-medium text-slate-400 transition-colors hover:text-slate-600"
                  >
                    Not now
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Settings-page toggle
export function PushNotificationToggle() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2.5 text-sm text-slate-400">
        <BellOff className="h-4 w-4 shrink-0" />
        <span>Push notifications are not supported in this browser.</span>
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500 ring-1 ring-slate-100">
        <BellOff className="h-4 w-4 shrink-0 text-slate-400" />
        <span>
          Notifications are blocked.{" "}
          <span className="font-medium text-slate-700">
            Re-enable them in your browser settings.
          </span>
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
          isSubscribed ? "bg-orange-50" : "bg-slate-100",
        )}
      >
        <Bell
          className={cn(
            "h-4 w-4 transition-colors",
            isSubscribed ? "text-orange-500" : "text-slate-400",
          )}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800">Push notifications</p>
        <p className="truncate text-xs text-slate-400">
          {isSubscribed
            ? "You'll receive alerts for orders and messages."
            : "Enable real-time order and message alerts."}
        </p>
      </div>

      <button
        onClick={isSubscribed ? unsubscribe : subscribe}
        disabled={isLoading}
        className={cn(
          "shrink-0 rounded-xl px-4 py-2 text-xs font-semibold transition-all disabled:opacity-60",
          isSubscribed
            ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
            : "bg-orange-500 text-white shadow-sm shadow-orange-200 hover:bg-orange-600",
        )}
      >
        {isLoading ? "…" : isSubscribed ? "Turn off" : "Turn on"}
      </button>
    </div>
  );
}
