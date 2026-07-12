"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { Bell, BellOff, BatteryWarning, Download, X } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useIsInstalled } from "@/hooks/useIsInstalled";
import { cn } from "@/lib/utils";
import { installPromptStore } from "@/lib/installPromptStore";
import { isTranssionDevice } from "@/lib/deviceDetection";

function useInstallPrompt() {
  // The captured beforeinstallprompt lives in installPromptStore (filled by
  // ServiceWorkerRegistrar, possibly before this mounts). Read it via
  // useSyncExternalStore so a capture that lands after mount re-renders us too.
  const prompt = useSyncExternalStore(
    installPromptStore.subscribe,
    installPromptStore.get,
    () => null,
  );
  const isInstalled = useIsInstalled();

  // installPromptStore is specific to this component's own install flow
  // (not something useIsInstalled should know about) — clear the captured
  // prompt once installed so a stale one never lingers.
  useEffect(() => {
    if (isInstalled) installPromptStore.clear();
  }, [isInstalled]);

  return { prompt, isInstalled, canInstall: !!prompt && !isInstalled };
}

// Separate from push-banner-skipped-at (the "Not now"/36h cooldown on the
// enable-alerts flow) — this is a one-time, permanent dismiss for the
// standalone battery tip below, unrelated to whether alerts are enabled.
const BATTERY_TIP_DISMISSED_KEY = "transsion-battery-tip-dismissed";

export default function PushNotificationManager() {
  const {
    showInstallBanner,
    showAlertsBanner,
    isLoading,
    subscribe,
    dismiss,
    permission,
  } = usePushNotifications();
  const { prompt: installPrompt, canInstall } = useInstallPrompt();
  const [isActioning, setIsActioning] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  // Push is unreliable (or on iOS Safari, unavailable) outside an installed,
  // standalone PWA — so install comes first (showInstallBanner) and alerts are
  // only asked for once already installed (showAlertsBanner). The battery step
  // is reached only from the alerts flow, i.e. only once isInstalled is true.
  const [step, setStep] = useState<"main" | "battery">("main");
  // iOS Safari has no beforeinstallprompt — install is manual via the Share sheet.
  const [isIOS] = useState(
    () =>
      typeof navigator !== "undefined" &&
      /iphone|ipad|ipod/i.test(navigator.userAgent),
  );
  // XOS (Tecno/Infinix/itel) kills backgrounded apps aggressively, which silently
  // drops the push subscription — surfaced nowhere else the user would see it.
  const [isTranssion] = useState(() => isTranssionDevice());
  // The embedded battery step below only ever fires inside handlePrimary, i.e.
  // during a first-time "Enable alerts" tap (permission === "default"). Anyone
  // who already granted permission before this tip shipped — or who granted it
  // on a non-Transsion install and later moved SIM/app to a Transsion phone —
  // would otherwise never see it. This standalone flag reaches them instead,
  // independent of that gesture flow, once, ever (persisted in localStorage).
  const [standaloneDismissed, setStandaloneDismissed] = useState(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem(BATTERY_TIP_DISMISSED_KEY) === "1",
  );
  const showStandaloneBatteryTip =
    isTranssion && permission === "granted" && !standaloneDismissed;
  const dismissStandaloneTip = () => {
    localStorage.setItem(BATTERY_TIP_DISMISSED_KEY, "1");
    setStandaloneDismissed(true);
  };

  useEffect(() => {
    const sync = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  const close = () => {
    setStep("main");
    dismiss();
  };

  // Battery step is only ever entered from handleAlerts, which only runs once
  // isInstalled is true — so there's nothing left to chain to afterwards.
  const dismissBatteryStep = () => close();

  // Pre-install phase: no permission request here at all — installing first is
  // the whole point (push doesn't work reliably, or at all on iOS Safari,
  // outside a standalone PWA). Deliberately doesn't call dismiss()/close() on
  // a successful or native-declined prompt — isInstalled flipping true (via
  // the appinstalled listener in useIsInstalled) is what should advance the
  // flow to showAlertsBanner, not an explicit close.
  const handleInstall = async () => {
    // No captured prompt (suppressed / iOS) — the body shows manual steps, so
    // this button just acknowledges. That's a real dismissal (nothing else to
    // wait for reactively), so it does start the cooldown.
    if (!canInstall) {
      close();
      return;
    }
    setIsActioning(true);
    try {
      await installPrompt!.prompt();
    } catch {
      /* user dismissed or browser blocked it — banner just stays open */
    } finally {
      setIsActioning(false);
    }
  };

  // Post-install phase: ask for alert permission using this click's user
  // activation (the banner only ever shows when permission is still
  // "default", so a fresh prompt is always required, and it must run on a
  // live gesture). Deliberately doesn't close() on success — isSubscribed
  // flipping true is what naturally hides the banner (see showAlertsBanner),
  // without starting the "skipped" cooldown for something the user said yes to.
  const handleAlerts = async () => {
    setIsActioning(true);
    try {
      await subscribe();
      // Transsion/XOS devices silently drop push in the background — warn
      // right after granting, while attention is already on this card.
      if (isTranssion) setStep("battery");
    } finally {
      setIsActioning(false);
    }
  };

  const busy = isActioning || isLoading;
  const onBatteryStep = step === "battery";
  // Both onBatteryStep (mid-flow) and showStandaloneBatteryTip (already-
  // subscribed) render the same battery-warning content, just with different
  // dismiss wiring below.
  const showingBatteryContent = onBatteryStep || showStandaloneBatteryTip;
  const open =
    showInstallBanner ||
    showAlertsBanner ||
    onBatteryStep ||
    showStandaloneBatteryTip;

  // Portaled to document.body (same fix as AnchoredPopover) — this was
  // previously rendered inline inside the dashboard's scrollable <main>,
  // so its "fixed inset-0" backdrop only ever covered that ancestor's box
  // instead of the real browser viewport, exactly the clipping bug this
  // app already solved for dropdowns.
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Full-screen backdrop, every breakpoint — not just mobile. It has
              no onClick (see below): its job is purely to intercept/absorb
              stray clicks on the page underneath so they can never reach
              anything there, not to dismiss the modal itself. Only the X and
              "Not now"/"Skip" buttons (both wired to the same `dismiss`) are
              allowed to close it. */}
          <motion.div
            key="pnm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
            aria-hidden
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
                onClick={
                  showStandaloneBatteryTip ? dismissStandaloneTip : close
                }
                aria-label="Dismiss"
                className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="px-5 pb-5 pt-4">
                {/* Header */}
                <div className="mb-4 flex items-center gap-3 pr-6">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-sm shadow-orange-200">
                    {showingBatteryContent ? (
                      <BatteryWarning className="h-5 w-5 text-white" />
                    ) : (
                      <Bell className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-orange-500">
                      Velte
                    </p>
                    <h3 className="text-[15px] font-semibold leading-tight text-slate-900">
                      {showingBatteryContent
                        ? "Keep alerts working on this phone"
                        : showInstallBanner
                          ? "Get the full experience"
                          : "Turn on alerts"}
                    </h3>
                  </div>
                </div>

                {/* Body */}
                <p className="text-[13px] leading-relaxed text-slate-500">
                  {showingBatteryContent
                    ? "Your phone's battery saver can silently stop notifications once Velte is in the background. Open Settings → Apps → Chrome → Battery, choose “No restrictions” / “Allow background activity”, and avoid swiping Velte away from your recent apps."
                    : showInstallBanner
                      ? canInstall
                        ? "Install Velte on your device for one-tap access — you'll be asked to enable alerts for new leads and low wallet balance right after."
                        : isIOS
                          ? "Add Velte to your home screen for one-tap access and reliable alerts: tap the Share icon in Safari, then choose “Add to Home Screen”."
                          : "Add Velte to your home screen for one-tap access and reliable alerts: open your browser menu (⋮) and choose “Install app” / “Add to Home screen”."
                      : "Turn on alerts to get notified the moment a buyer reaches out or your wallet balance runs low."}
                </p>

                {/* Feature pills — skip on any battery-tip content, it's
                    settings guidance, not a feature callout */}
                {!showingBatteryContent && (
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
                )}

                {/* Actions */}
                <div className="mt-5 flex items-center gap-3">
                  <button
                    onClick={
                      onBatteryStep
                        ? dismissBatteryStep
                        : showStandaloneBatteryTip
                          ? dismissStandaloneTip
                          : showInstallBanner
                            ? handleInstall
                            : handleAlerts
                    }
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
                        {showInstallBanner ? "Installing…" : "Enabling…"}
                      </>
                    ) : showingBatteryContent ? (
                      "Got it"
                    ) : showInstallBanner ? (
                      canInstall ? (
                        <>
                          <Download className="h-3.5 w-3.5" />
                          Install app
                        </>
                      ) : (
                        "Got it"
                      )
                    ) : (
                      <>
                        <Bell className="h-3.5 w-3.5" />
                        Enable alerts
                      </>
                    )}
                  </button>

                  {/* Standalone tip has nothing to "skip" past — the X and
                      the primary "Got it" already cover dismissal. */}
                  {!showStandaloneBatteryTip && (
                    <button
                      onClick={onBatteryStep ? dismissBatteryStep : close}
                      className="shrink-0 text-[13px] font-medium text-slate-400 transition-colors hover:text-slate-600"
                    >
                      {onBatteryStep || showInstallBanner ? "Skip" : "Not now"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
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
