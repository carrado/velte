"use client";

import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { useUserStore } from "@/store/userStore";
import { usersApi } from "@/services/users";
import { useOnboardingStore, ONBOARDING_STEPS } from "@/store/onboardingStore";

// Renders when `user.onboarding === true` — a one-way server flag (see
// User.onboarding's own doc comment), so once it flips false here it never
// shows again until the backend resets it.

const GAP = 12; // px between the spotlighted target and the tooltip card
const PADDING = 6; // px the spotlight ring extends past the target's own rect
const CARD_WIDTH = 300;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

// Every step lists a desktop (Sidebar) and mobile (BottomNav) selector for
// the same logical target — only one is ever actually visible at a time
// (`hidden lg:flex` vs `md:hidden`), so pick whichever has real layout size.
function resolveTarget(selectors: string[]): HTMLElement | null {
  for (const selector of selectors) {
    const el = document.querySelector<HTMLElement>(selector);
    if (el && el.getClientRects().length > 0) return el;
  }
  return null;
}

export default function OnboardingTour() {
  const user = useUserStore((s) => s.user);
  const { currentStep, next, reset } = useOnboardingStore();
  const [rect, setRect] = useState<Rect | null>(null);
  const [finishing, setFinishing] = useState(false);

  const active = user?.onboarding === true;
  const step = ONBOARDING_STEPS[currentStep];

  // Re-measures on mount, on every step change, and on resize/scroll (a
  // rotated phone or a resized browser window can flip which of the two
  // selectors above is the visible one, or move the target within the
  // viewport) — same pattern AnchoredPopover uses for the same reason.
  useLayoutEffect(() => {
    if (!active) return;
    const measure = () => {
      const el = resolveTarget(step.selectors);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, step]);

  if (!active || typeof document === "undefined") return null;

  const finish = async () => {
    if (!user || finishing) return;
    setFinishing(true);
    try {
      await usersApi.update(user.id, { onboarding: false });
      reset();
    } catch {
      toast.error("Couldn't save that — please try again.");
      setFinishing(false);
    }
  };

  const isLast = currentStep === ONBOARDING_STEPS.length - 1;
  const handleNext = () => {
    if (isLast) void finish();
    else next();
  };

  const spot: Rect | null = rect
    ? {
        top: rect.top - PADDING,
        left: rect.left - PADDING,
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2,
      }
    : null;

  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const cardWidth = Math.min(CARD_WIDTH, vw - 32);
  // A bottom-nav target sits in the lower half of the screen and needs the
  // card ABOVE it (there's no room below); a sidebar target has room below.
  const placeAbove = spot ? spot.top > vh / 2 : false;
  const cardLeft = spot
    ? Math.min(
        Math.max(spot.left + spot.width / 2 - cardWidth / 2, 16),
        vw - cardWidth - 16,
      )
    : vw / 2 - cardWidth / 2;

  return createPortal(
    <div className="fixed inset-0 z-[200]">
      {/* Invisible full-screen click-blocker — the box-shadow spotlight
          below only ever paints darkness, it can't intercept clicks outside
          its own box, so this is what actually stops the buyer interacting
          with the page underneath while the tour is up. */}
      <div className="absolute inset-0 pointer-events-auto" />

      {spot ? (
        <div
          className="absolute rounded-xl ring-2 ring-orange-500 pointer-events-none transition-all duration-200 ease-out"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
          }}
        />
      ) : (
        // Target not found (yet) — still dim the screen rather than showing
        // a floating card over a fully interactive, undimmed page.
        <div className="absolute inset-0 bg-black/60 pointer-events-none" />
      )}

      <div
        className="absolute rounded-xl bg-white p-4 shadow-xl transition-all duration-200 ease-out"
        style={{
          width: cardWidth,
          left: cardLeft,
          ...(spot
            ? placeAbove
              ? { bottom: vh - spot.top + GAP }
              : { top: spot.top + spot.height + GAP }
            : { top: "50%", transform: "translateY(-50%)" }),
        }}
      >
        <p className="mb-1 text-dash-caption font-semibold uppercase tracking-wide text-gray-400">
          Step {currentStep + 1} of {ONBOARDING_STEPS.length}
        </p>
        <h3 className="mb-1 text-dash-heading font-semibold text-[#111827]">
          {step.title}
        </h3>
        <p className="mb-4 text-dash-body text-gray-600">{step.body}</p>
        <div className="flex items-center justify-between">
          <button
            onClick={() => void finish()}
            disabled={finishing}
            className="cursor-pointer text-dash-body font-medium text-gray-500 transition-colors hover:text-gray-700 disabled:opacity-50"
          >
            Skip
          </button>
          <button
            onClick={handleNext}
            disabled={finishing}
            className="cursor-pointer rounded-lg bg-orange-500 px-4 py-2 text-dash-body font-medium text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
          >
            {isLast ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
