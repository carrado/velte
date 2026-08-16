"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  Download,
  Zap,
  Bell,
  Rocket,
  Share,
  MoreVertical,
  Menu as MenuIcon,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { useIsInstalled } from "@/hooks/useIsInstalled";
import { installPromptStore } from "@/lib/installPromptStore";
import { getInstallHint } from "@/lib/deviceDetection";
import { cn } from "@/lib/utils";

const BENEFITS = [
  { icon: Rocket, text: "One-tap access — no browser, no searching for a tab" },
  { icon: Bell, text: "Real-time alerts the moment something needs you" },
  { icon: Zap, text: "Faster, right from your home screen" },
];

const GUIDE_ICONS = { share: Share, dots: MoreVertical, lines: MenuIcon };

/* A permanent settings-page card — NOT the dismissible install banner
 * (PushNotificationManager, vendor) or the dismissible /chat popup
 * (BuyerInstallPrompt, buyer), both of which can be skipped/cooled-down
 * away. Shared between the buyer Profile page and the vendor Settings
 * page verbatim, on purpose: this component has no actor-specific logic
 * at all (no buyer/vendor session, nothing account-scoped) — it's pure
 * install-prompt/device detection, so a second near-identical copy would
 * only ever drift from this one.
 *
 * Every state here is a real, clickable CTA — not a paragraph to read.
 * What the click actually DOES differs because the platform genuinely
 * differs (no code choice can change this):
 *   - A captured beforeinstallprompt (Chromium, already granted): tap =
 *     the real native install, immediately.
 *   - No prompt captured YET, but this IS a Chromium browser that could
 *     still grant one this session: tap re-checks the store fresh (best
 *     chance of catching it) and installs for real if it's there now;
 *     otherwise reveals a short animated visual guide, not a wall of text.
 *   - iOS Safari: Apple exposes no install API at all, ever — tap reveals
 *     the same kind of visual guide pointing at the Share icon.
 *   - Firefox desktop: no install mechanism exists, manual or automatic —
 *     tap does the one genuinely useful automatic thing available
 *     (copies the link so it can be pasted into Chrome/Edge). */
export function InstallRow() {
  // Captured by ServiceWorkerRegistrar (root layout, mounted site-wide) —
  // already populated by the time either dashboard reaches this card.
  const prompt = useSyncExternalStore(
    installPromptStore.subscribe,
    installPromptStore.get,
    () => null,
  );
  const isInstalled = useIsInstalled();
  const canInstall = !!prompt && !isInstalled;

  useEffect(() => {
    if (isInstalled) installPromptStore.clear();
  }, [isInstalled]);

  const [isIOS] = useState(
    () =>
      typeof navigator !== "undefined" &&
      /iphone|ipad|ipod/i.test(navigator.userAgent),
  );
  const [installHint] = useState(() => getInstallHint());
  const [isInstalling, setIsInstalling] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const runInstall = async (activePrompt: NonNullable<typeof prompt>) => {
    setIsInstalling(true);
    try {
      await activePrompt.prompt();
    } catch {
      /* user dismissed or browser blocked it — card just stays as-is */
    } finally {
      setIsInstalling(false);
    }
  };

  const handleTap = async () => {
    if (isInstalling) return;

    // Re-check fresh, not the stale render-time `prompt` — a Chromium
    // browser that hadn't granted the event at mount may have granted it
    // since (engagement heuristics can clear mid-session).
    const live = installPromptStore.get();
    if (live) {
      await runInstall(live);
      return;
    }

    if (installHint.noInstallPath) {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied — paste it into Chrome or Edge to install.");
      } catch {
        toast.error(
          "Couldn't copy the link. Long-press the address bar instead.",
        );
      }
      return;
    }

    setShowGuide(true);
  };

  // Nothing left to sell once actually installed — the card disappears
  // entirely rather than leaving a static "✓ installed" row behind (the
  // Notifications section right below it is the thing still worth
  // keeping around).
  if (isInstalled) return null;

  const GuideIcon = GUIDE_ICONS[isIOS ? "share" : installHint.icon];
  const guideSteps = isIOS
    ? 'Tap the Share icon, then "Add to Home Screen".'
    : installHint.steps;
  // canInstall always wins the label/icon even though it's already
  // handled separately at the top of handleTap — a live captured prompt
  // and installHint.noInstallPath (Firefox desktop) can never really
  // coexist, but the label shouldn't lie if they somehow did.
  const copyLinkOnly = installHint.noInstallPath && !canInstall;
  const ctaLabel = copyLinkOnly ? "Copy install link" : "Install app";

  return (
    <button
      type="button"
      onClick={handleTap}
      disabled={isInstalling}
      className={cn(
        "w-full text-left rounded-2xl border border-orange-100 bg-orange-50/40 p-4 transition-colors cursor-pointer",
        "hover:bg-orange-50 disabled:opacity-70 disabled:cursor-wait",
      )}
    >
      <div className="flex items-center gap-3 mb-3.5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shrink-0 shadow-sm shadow-orange-200">
          <Download size={17} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-dash-body font-bold text-gray-900">
            Get the Velte app
          </p>
          <p className="text-dash-caption text-gray-400">
            {canInstall
              ? "Tap anywhere on this card to install"
              : "Tap to get started"}
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {BENEFITS.map(({ icon: Icon, text }) => (
          <li
            key={text}
            className="flex items-start gap-2 text-dash-caption text-gray-600 text-left"
          >
            <Icon size={13} className="text-orange-500 shrink-0 mt-0.5" />
            {text}
          </li>
        ))}
      </ul>

      {/* Revealed by the tap, not shown upfront as a paragraph — the guide
          only exists because there's genuinely no programmatic install API
          on this platform, but it still reads as "you tapped, here's what
          happens next," not "read this first." */}
      {showGuide && (
        <div
          className="mt-3.5 flex items-center gap-3 rounded-xl bg-white border border-gray-200 px-3.5 py-3 animate-in fade-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
            <GuideIcon size={16} className="text-orange-500" />
            <span className="absolute inset-0 rounded-lg ring-2 ring-orange-300 animate-ping" />
          </div>
          <p className="text-dash-body text-gray-700">{guideSteps}</p>
        </div>
      )}

      <div className="mt-3.5 flex items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2.5 text-dash-body font-semibold text-white shadow-sm shadow-orange-200">
        {isInstalling ? (
          "Installing…"
        ) : (
          <>
            {copyLinkOnly ? <Copy size={15} /> : <Download size={15} />}
            {ctaLabel}
          </>
        )}
      </div>
    </button>
  );
}
