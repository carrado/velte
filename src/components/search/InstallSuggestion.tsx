"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { useIsInstalled } from "@/hooks/useIsInstalled";
import { installPromptStore } from "@/lib/installPromptStore";
import { cn } from "@/lib/utils";
import { DownloadIcon } from "@/components/icons";

// The install nudge, offered INSIDE the conversation (2026-08-29).
//
// Replaces BuyerInstallPrompt, a fixed-position card that portalled itself
// over the thread 30 seconds after arrival. That version interrupted: it
// appeared mid-thought, on top of what someone was reading, before they had
// any reason to want the app. This one arrives as part of the conversation,
// after a search has actually finished and delivered something — the moment
// the product has just proved itself, which is the only moment "keep this
// one tap away" is a reasonable thing to say.
//
// TIMING RULES (per explicit request):
//   - Suggested only after a COMPLETED session — a turn that finished and
//     produced results, never mid-search and never after an empty one.
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
    // scrolls past without engaging has effectively declined, and should get
    // the same 48 hours of quiet as someone who taps "Not now".
    markSuggested();
    setVisible(true);
  }, [sessionsCompleted, isInstalled, canInstall, isIOS]);

  if (!visible || isInstalled) return null;

  const handleInstall = async () => {
    if (!prompt) {
      // iOS, or the prompt expired — the text already explains the manual
      // route, so there is nothing to do but acknowledge.
      setVisible(false);
      return;
    }
    setInstalling(true);
    try {
      await prompt.prompt();
    } catch {
      /* declined at the OS level, or blocked — leave the message in place */
    } finally {
      setInstalling(false);
    }
  };

  return (
    // No fill, no border, no icon tile — this is Velte speaking, and every
    // one of Velte's messages reads as plain text in the thread (see
    // AI_MESSAGE_CLASS in SearchHome, which this deliberately mirrors:
    // `max-w-md` is a reading measure, not a box). A tinted panel would have
    // made the one message that asks for something look like an advert
    // dropped into the conversation.
    <div className="mt-4 max-w-md">
      <p className="text-sm leading-relaxed text-[#023337]">
        {canInstall
          ? "By the way — you can keep Velte one tap away. Want me to add it to your home screen?"
          : isIOS
            ? 'By the way — you can keep Velte one tap away. In Safari, tap the Share icon, then "Add to Home Screen."'
            : "By the way — you can keep Velte one tap away by adding it to your home screen from your browser menu."}
      </p>
      <div className="mt-2 flex items-center gap-3">
        {canInstall && (
          <button
            type="button"
            onClick={handleInstall}
            disabled={installing}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-3.5 py-1.5",
              "text-xs font-semibold text-white transition-colors",
              "hover:bg-orange-600 disabled:opacity-60",
            )}
          >
            {installing ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Adding…
              </>
            ) : (
              <>
                <DownloadIcon className="h-3 w-3" />
                Add to home screen
              </>
            )}
          </button>
        )}
        {/* A plain text link, not an icon button in the corner — there is no
            panel left for it to sit in, and "Not now" reads as part of the
            same sentence rather than as chrome. */}
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="text-xs font-medium text-gray-500 transition-colors hover:text-gray-700"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
