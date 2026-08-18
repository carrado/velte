"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { useIsInstalled } from "@/hooks/useIsInstalled";
import { installPromptStore } from "@/lib/installPromptStore";
import { cn } from "@/lib/utils";
import { CloseIcon, DownloadIcon } from "@/components/icons";

// Buyer-facing install nudge for /chat — deliberately separate from
// PushNotificationManager, which is vendor-only (usePushNotifications gates
// its own install banner on `!!user`, i.e. a logged-in vendor) and chains
// straight into an "Enable alerts" step right after install. A buyer here is
// anonymous by design (no account, see SearchHome's own getMeSilent comment)
// and should never see a notification-permission prompt — this component
// only ever offers the install step and never touches Notification.* or push
// subscription at all.
const DISMISSED_KEY = "buyer-install-skipped-at";
const DISMISS_COOLDOWN_MS = 36 * 60 * 60 * 1000; // same cadence as the vendor flow
const SHOW_DELAY_MS = 30 * 1000; // a buyer isn't logged in for 5 min like a vendor session — nudge sooner

function useInstallPrompt() {
  // Captured by ServiceWorkerRegistrar (root layout, mounted site-wide) —
  // already populated by the time a buyer reaches /chat either way.
  const prompt = useSyncExternalStore(
    installPromptStore.subscribe,
    installPromptStore.get,
    () => null,
  );
  const isInstalled = useIsInstalled();

  useEffect(() => {
    if (isInstalled) installPromptStore.clear();
  }, [isInstalled]);

  return { prompt, isInstalled, canInstall: !!prompt && !isInstalled };
}

export function BuyerInstallPrompt() {
  const { prompt, isInstalled, canInstall } = useInstallPrompt();
  // iOS Safari has no beforeinstallprompt — install is manual via the Share sheet.
  const [isIOS] = useState(
    () =>
      typeof navigator !== "undefined" &&
      /iphone|ipad|ipod/i.test(navigator.userAgent),
  );
  const [delayPassed, setDelayPassed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    const skippedAt = localStorage.getItem(DISMISSED_KEY);
    if (
      skippedAt &&
      Date.now() - parseInt(skippedAt, 10) < DISMISS_COOLDOWN_MS
    ) {
      setDismissed(true);
      return;
    }
    const timer = setTimeout(() => setDelayPassed(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
    setDismissed(true);
  };

  // No permission request here, ever — installing is the whole point, never
  // a lead-in to one. A successful or native-declined prompt doesn't call
  // dismiss(): isInstalled flipping true (via useIsInstalled's appinstalled
  // listener) is what naturally closes this, same reasoning as the vendor
  // flow's own handleInstall.
  const handleInstall = async () => {
    if (!canInstall) {
      dismiss();
      return;
    }
    setIsInstalling(true);
    try {
      await prompt!.prompt();
    } catch {
      /* user dismissed or browser blocked it — card just stays open */
    } finally {
      setIsInstalling(false);
    }
  };

  // Nothing worth showing once installed/dismissed, before the delay, or
  // when there's no real way to install at all (no captured prompt and not
  // iOS — e.g. desktop Firefox, which supports neither path).
  const open =
    delayPassed && !dismissed && !isInstalled && (canInstall || isIOS);
  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="buyer-install-card"
        initial={{ y: 24, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 24, opacity: 0, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 360, damping: 28 }}
        className="fixed z-50 bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-[360px]"
      >
        <div className="relative overflow-hidden rounded-2xl bg-white shadow-[0_12px_40px_-8px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.06]">
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <CloseIcon className="h-4 w-4" />
          </button>

          <div className="px-5 pb-5 pt-4">
            <div className="mb-3 flex items-center gap-3 pr-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-sm shadow-orange-200">
                <DownloadIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-orange-500">
                  Velte
                </p>
                <h3 className="text-[15px] font-semibold leading-tight text-slate-900">
                  Get the app
                </h3>
              </div>
            </div>

            <p className="text-[13px] leading-relaxed text-slate-500">
              {canInstall
                ? "Install Velte for one-tap access to search — no app store needed."
                : isIOS
                  ? 'Add Velte to your home screen: tap the Share icon in Safari, then "Add to Home Screen."'
                  : "Add Velte to your home screen from your browser menu for one-tap access."}
            </p>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleInstall}
                disabled={isInstalling}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-xl",
                  "bg-orange-500 px-4 py-2.5 text-[13px] font-semibold text-white",
                  "shadow-sm shadow-orange-200/80 transition-all",
                  "hover:bg-orange-600 active:scale-[0.97]",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                )}
              >
                {isInstalling ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Installing…
                  </>
                ) : canInstall ? (
                  <>
                    <DownloadIcon className="h-3.5 w-3.5" />
                    Install app
                  </>
                ) : (
                  "Got it"
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
    </AnimatePresence>,
    document.body,
  );
}
