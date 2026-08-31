"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";

import { useIsInstalled } from "@/hooks/useIsInstalled";
import { installPromptStore } from "@/lib/installPromptStore";
import { cn } from "@/lib/utils";
import { CloseIcon, DownloadIcon } from "@/components/icons";

// The install nudge for /chat.
//
// Two swings at this, and the current shape takes the good half of each:
//
//   BuyerInstallPrompt (until 2026-08-29) was a portalled card that appeared
//   30 seconds after arrival. Right FORM, wrong MOMENT — it interrupted
//   mid-thought, before the product had given anyone a reason to want it.
//
//   The in-thread text that replaced it fixed the moment and lost the form:
//   as a line of Velte's own prose it read as the assistant talking about
//   itself, and it scrolled away with the conversation like any other
//   message — easy to miss entirely.
//
// So: the card is back (per explicit request, 2026-08-29), with the timing
// rules the in-thread version introduced.
//
// TIMING RULES:
//   - Shown only after a COMPLETED session — a turn that finished and
//     produced something, never mid-search and never after an empty one.
//   - Dismissed or ignored → nothing for 48 HOURS.
//   - Once that window passes, the next completed session offers it again.
//
// Deliberately NOT decided by the model. Whether an app is installed, and
// whether the browser can even offer to install it, are browser facts the
// LLM has no access to — asking it to judge that would produce confident
// suggestions to install an app the buyer already has, on browsers that
// can't. The model owns what it says about products; this owns what the
// browser can do.

const DISMISSED_KEY = "velte-install-suggested-at";
const COOLDOWN_MS = 48 * 60 * 60 * 1000;

/** Has the cooldown from the last suggestion elapsed? Read once when the
 *  component mounts, and again whenever a new session completes. */
function cooledDown(): boolean {
  try {
    const last = localStorage.getItem(DISMISSED_KEY);
    if (!last) return true;
    const at = Number.parseInt(last, 10);
    if (!Number.isFinite(at)) return true;
    return Date.now() - at >= COOLDOWN_MS;
  } catch {
    // Private mode, blocked storage — treat as never suggested. Worst case
    // is one extra offer, which beats never offering at all.
    return true;
  }
}

function markSuggested() {
  try {
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
  } catch {
    /* nothing to do — the suggestion simply may reappear */
  }
}

export function InstallSuggestion({
  /** Bumped by SearchHome each time a session completes. Used only as a
   *  trigger — the value itself is meaningless. */
  sessionsCompleted,
}: {
  sessionsCompleted: number;
}) {
  const prompt = useSyncExternalStore(
    installPromptStore.subscribe,
    installPromptStore.get,
    () => null,
  );
  const isInstalled = useIsInstalled();
  const canInstall = Boolean(prompt) && !isInstalled;

  // iOS Safari has no beforeinstallprompt — install is manual via the Share
  // sheet, so the only thing on offer there is instructions.
  const [isIOS] = useState(
    () =>
      typeof navigator !== "undefined" &&
      /iphone|ipad|ipod/i.test(navigator.userAgent),
  );

  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  // Portals need a DOM to portal INTO, which the server render doesn't have.
  // Gating on mount rather than reaching for `document` during render is what
  // keeps this safe to include in a server-rendered tree.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (isInstalled) installPromptStore.clear();
  }, [isInstalled]);

  useEffect(() => {
    // Nothing before the first completed session, and nothing at all if
    // there's no real way to install on this browser.
    if (sessionsCompleted < 1) return;
    if (isInstalled) return;
    if (!canInstall && !isIOS) return;
    if (!cooledDown()) return;

    // Stamped as soon as it is SHOWN, not when dismissed — someone who
    // ignores the card has effectively declined, and should get the same 48
    // hours of quiet as someone who taps "Not now".
    markSuggested();
    setVisible(true);
  }, [sessionsCompleted, isInstalled, canInstall, isIOS]);

  const handleInstall = async () => {
    if (!prompt) {
      // iOS, or the prompt expired — the text already explains the manual
      // route, so the button is just an acknowledgement.
      setVisible(false);
      return;
    }
    setInstalling(true);
    try {
      await prompt.prompt();
    } catch {
      /* declined at the OS level, or blocked — leave the card in place */
    } finally {
      setInstalling(false);
    }
  };

  if (!mounted || !visible || isInstalled) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="velte-install-card"
        initial={{ y: 24, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 24, opacity: 0, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 360, damping: 28 }}
        // Bottom-anchored, and on a phone it sits ABOVE the composer's safe
        // area rather than over it — the composer is what someone is reaching
        // for, and a card covering it would make the app feel broken at the
        // exact moment it is asking for a favour.
        className="fixed z-50 bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-4 right-4 md:left-auto md:right-6 md:w-[360px]"
        role="dialog"
        aria-label="Add Velte to your home screen"
      >
        <div className="relative overflow-hidden rounded-2xl bg-white shadow-[0_12px_40px_-8px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.06]">
          <button
            type="button"
            onClick={() => setVisible(false)}
            aria-label="Dismiss"
            className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
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
                  Keep Velte one tap away
                </h3>
              </div>
            </div>

            {/* Earns the ask by pointing at what just happened, rather than
                pitching an app in the abstract — this only ever appears after
                a search that actually delivered something. */}
            <p className="text-[13px] leading-relaxed text-slate-500">
              {canInstall
                ? "Add Velte to your home screen and your next search is one tap away — no app store needed."
                : isIOS
                  ? 'Add Velte to your home screen: tap the Share icon in Safari, then "Add to Home Screen."'
                  : "Add Velte to your home screen from your browser menu, and your next search is one tap away."}
            </p>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={handleInstall}
                disabled={installing}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-xl",
                  "bg-orange-500 px-4 py-2.5 text-[13px] font-semibold text-white",
                  "shadow-sm shadow-orange-200/80 transition-all",
                  "hover:bg-orange-600 active:scale-[0.97]",
                  "disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer",
                )}
              >
                {installing ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Adding…
                  </>
                ) : canInstall ? (
                  <>
                    <DownloadIcon className="h-3.5 w-3.5" />
                    Add to home screen
                  </>
                ) : (
                  "Got it"
                )}
              </button>
              <button
                type="button"
                onClick={() => setVisible(false)}
                className="shrink-0 text-[13px] font-medium text-slate-400 transition-colors hover:text-slate-600 cursor-pointer"
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
