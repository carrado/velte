"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useNavigation } from "./NavigationProgressContext";
import { useOnboardingStore } from "@/store/onboardingStore";
import type { OnboardingStep } from "@/store/onboardingStore";
import { useUserStore } from "@/store/userStore";
import { usersApi } from "@/services/users";
import { cn } from "@/lib/utils";

// ── Step configuration ────────────────────────────────────────────────────────

const STEPS = {
  1: {
    Icon: CreditCard,
    badge: "Required First",
    stepLabel: "Step 1 of 3",
    title: "Payment Setup",
    description:
      "Required before anything else. Without this the AI cannot generate payment links. Connect your bank account so customers can pay you directly through your store.",
    targetPath: "transactions",
    targetElementId: "generate-link-section",
    sidebarNavId: "transaction-nav",
    ctaLabel: "Go to Transactions",
    instruction:
      'Click "Generate Link" below to connect your bank account and create your payment link.',
  },
  2: {
    Icon: Sparkles,
    badge: "Step 2 of 3",
    stepLabel: "Step 2 of 3",
    title: "AI Setup",
    description:
      "Connect your WhatsApp Business account and configure your AI assistant to automate customer responses, process orders, and deliver real-time insights across your dashboard.",
    targetPath: "ai-setup",
    targetElementId: "ai-setup-content",
    sidebarNavId: "ai-settings-nav",
    ctaLabel: "Set Up AI Assistant",
    instruction:
      "Complete all three steps below to activate your AI assistant.",
  },
  3: {
    Icon: MessageCircle,
    badge: "Final Step",
    stepLabel: "Step 3 of 3",
    title: "WhatsApp Business Profile",
    description:
      "Customise how your business appears to customers on WhatsApp — including your display name, about text, address, website, and featured products.",
    targetPath: "settings",
    targetElementId: "whatsapp-profile-section",
    sidebarNavId: "settings-nav",
    ctaLabel: "Go to Settings",
    instruction:
      "Fill in your WhatsApp business profile details and click Save.",
  },
} as const;

// ── Progress dots ─────────────────────────────────────────────────────────────

function StepDots({ current }: { current: OnboardingStep }) {
  return (
    <div className="flex items-center gap-1.5">
      {([1, 2, 3] as OnboardingStep[]).map((s) => (
        <div
          key={s}
          className={cn(
            "rounded-full transition-all duration-300",
            s === current
              ? "w-5 h-2 bg-orange-500"
              : s < current
                ? "w-2 h-2 bg-orange-300"
                : "w-2 h-2 bg-gray-200",
          )}
        />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OnboardingTour() {
  const { currentStep, isComplete, overlayPaused, initialized } =
    useOnboardingStore();
  const user = useUserStore((state) => state.user);
  const pathname = usePathname();
  const { navigate } = useNavigation();

  const userId = pathname.split("/")[1];
  const stepConfig = STEPS[currentStep];

  // Check if the current pathname is on the target page for the active step
  const subPath = pathname.split("/").slice(2).join("/");
  const onTargetPage =
    subPath === stepConfig.targetPath ||
    subPath.startsWith(stepConfig.targetPath + "/");

  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const cleanupRef = useRef<(() => void) | undefined>(undefined);
  const prevIsCompleteRef = useRef(false);
  const backdropTouchY = useRef(0);

  const updateRect = useCallback(() => {
    const el = document.getElementById(stepConfig.targetElementId);
    if (el) setTargetRect(el.getBoundingClientRect());
  }, [stepConfig.targetElementId]);

  // ── Mount & responsive ────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Show completion modal when onboarding finishes ───────────────────────
  useEffect(() => {
    if (isComplete && !prevIsCompleteRef.current) {
      setShowCompletionModal(true);
    }
    prevIsCompleteRef.current = isComplete;
  }, [isComplete]);

  // ── Find & track target element when on target page ───────────────────────
  useEffect(() => {
    cleanupRef.current?.();
    cleanupRef.current = undefined;
    setTargetRect(null);

    if (!mounted || !onTargetPage) return;

    let attempts = 0;

    const findEl = () => {
      const el = document.getElementById(stepConfig.targetElementId);
      if (el) {
        // Only set the initial rect if the element is already visible in the
        // viewport. For elements below the fold (e.g. whatsapp-profile-section
        // in settings), skip the initial call — an offscreen rect would position
        // the spotlight hole below the visible area. The IntersectionObserver
        // below fires updateRect once scrollIntoView brings it into view.
        const initialRect = el.getBoundingClientRect();
        if (initialRect.top < window.innerHeight && initialRect.bottom > 0) {
          setTargetRect(initialRect);
        }

        const mainEl = document.querySelector("main") as HTMLElement | null;

        // IntersectionObserver fires updateRect the moment the element enters
        // the viewport after scrollIntoView — more reliable than a fixed timer
        // because smooth scroll over long distances can take >750ms.
        const observer = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting) updateRect();
          },
          { root: mainEl, threshold: 0.1 },
        );
        observer.observe(el);

        // Also listen on scroll/resize for continuous tracking while user scrolls.
        window.addEventListener("resize", updateRect);
        window.addEventListener("scroll", updateRect, true);
        mainEl?.addEventListener("scroll", updateRect);

        cleanupRef.current = () => {
          observer.disconnect();
          window.removeEventListener("resize", updateRect);
          window.removeEventListener("scroll", updateRect, true);
          mainEl?.removeEventListener("scroll", updateRect);
        };
      } else if (attempts < 25) {
        attempts++;
        setTimeout(findEl, 200);
      } else {
        // Settings can mount #whatsapp-profile-section after a cached tab switch;
        // keep watching until the target appears.
        const mainEl = document.querySelector("main");
        const observer = new MutationObserver(() => {
          const lateEl = document.getElementById(stepConfig.targetElementId);
          if (lateEl) {
            observer.disconnect();
            findEl();
          }
        });
        observer.observe(mainEl ?? document.body, {
          childList: true,
          subtree: true,
        });
        cleanupRef.current = () => observer.disconnect();
      }
    };

    findEl();
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = undefined;
    };
  }, [
    mounted,
    onTargetPage,
    currentStep,
    pathname,
    stepConfig.targetElementId,
    updateRect,
  ]);

  // ── Scroll target into view on arrival ───────────────────────────────────
  useEffect(() => {
    if (!onTargetPage) return;
    // 500ms delay lets the page settle after navigation before scrolling.
    // Position update is handled by the IntersectionObserver set up in findEl,
    // which fires updateRect as soon as the element enters the viewport.
    const timer = setTimeout(() => {
      const el = document.getElementById(stepConfig.targetElementId);
      const mainEl = document.querySelector("main") as HTMLElement | null;
      if (!el) return;

      el.scrollIntoView({
        behavior: "smooth",
        block: currentStep === 3 ? "start" : "center",
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [onTargetPage, currentStep, stepConfig.targetElementId]);

  // ── Navigate to target page ───────────────────────────────────────────────
  const handleNavigate = () => {
    navigate(`/${userId}/${stepConfig.targetPath}`);
  };

  if (showCompletionModal) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-5 bg-black/70 backdrop-blur-sm">
        <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={32} className="text-green-500" />
          </div>
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">
            Setup Complete
          </p>
          <h2 className="text-[17px] font-bold text-[#023337] mb-3 leading-snug">
            You&apos;re all set!
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-7">
            Your store is fully configured. Start exploring your dashboard to
            manage orders, track sales, and chat with customers via WhatsApp.
          </p>
          <button
            onClick={() => {
              setShowCompletionModal(false);
              usersApi.updateOnboarding().catch(() => {});
            }}
            className="w-full py-3 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-colors cursor-pointer"
          >
            Start Exploring
          </button>
        </div>
      </div>
    );
  }

  // Wait for the layout to finish resolving the correct starting step before
  // rendering anything — prevents flashing step 1 during the API checks.
  if (!mounted || !initialized || !user || !user.onboarding || overlayPaused)
    return null;

  const { Icon } = stepConfig;

  // ── Backdrop scroll forwarding ────────────────────────────────────────────
  // The backdrop captures pointer events to block background interactions, but
  // we forward wheel and touch-scroll events so the user can scroll from anywhere.
  const getMain = () => document.querySelector("main") as HTMLElement | null;

  const handleBackdropWheel = (e: React.WheelEvent) => {
    const m = getMain();
    if (m) {
      m.scrollTop += e.deltaY;
      m.scrollLeft += e.deltaX;
    }
  };

  const handleBackdropTouchStart = (e: React.TouchEvent) => {
    backdropTouchY.current = e.touches[0].clientY;
  };

  const handleBackdropTouchMove = (e: React.TouchEvent) => {
    const m = getMain();
    if (!m) return;
    const y = e.touches[0].clientY;
    m.scrollTop += backdropTouchY.current - y;
    backdropTouchY.current = y;
  };

  // ── Shared: dark backdrop ─────────────────────────────────────────────────
  const Backdrop = (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm pointer-events-auto"
      aria-hidden="true"
      onWheel={handleBackdropWheel}
      onTouchStart={handleBackdropTouchStart}
      onTouchMove={handleBackdropTouchMove}
    />
  );

  // ── State 1: not on target page → centered modal ──────────────────────────
  if (!onTargetPage) {
    return (
      <>
        {Backdrop}
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-5 pointer-events-none">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl pointer-events-auto">
            {/* Progress header */}
            <div className="flex items-center justify-between mb-5">
              <StepDots current={currentStep} />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {stepConfig.stepLabel}
              </span>
            </div>

            {/* Icon */}
            <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mb-5">
              <Icon size={30} className="text-orange-500" />
            </div>

            {/* Badge */}
            <p className="text-xs font-semibold text-orange-500 uppercase tracking-wide mb-1">
              {stepConfig.badge}
            </p>

            {/* Title */}
            <h2 className="text-[17px] font-bold text-[#023337] mb-2 leading-snug">
              {stepConfig.title}
            </h2>

            {/* Description */}
            <p className="text-sm text-gray-500 leading-relaxed mb-7">
              {stepConfig.description}
            </p>

            {/* CTA */}
            <button
              onClick={handleNavigate}
              className="w-full flex items-center justify-center gap-2 py-3 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-colors cursor-pointer"
            >
              {stepConfig.ctaLabel}
              <ArrowRight size={16} />
            </button>

            {/* Step progress bar */}
            <div className="flex gap-1.5 mt-5">
              {([1, 2, 3] as OnboardingStep[]).map((s) => (
                <div
                  key={s}
                  className={cn(
                    "flex-1 h-1 rounded-full transition-colors",
                    s < currentStep
                      ? "bg-orange-400"
                      : s === currentStep
                        ? "bg-orange-500"
                        : "bg-gray-200",
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── State 2a: on target page, mobile ─────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {Backdrop}

        {/* Compact top card */}
        <div className="fixed top-0 left-0 right-0 z-[60] p-4 pointer-events-none">
          <div className="bg-white rounded-2xl p-4 shadow-2xl border border-gray-100 pointer-events-auto">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon size={17} className="text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-orange-500 uppercase tracking-wide">
                    {stepConfig.stepLabel}
                  </span>
                  <StepDots current={currentStep} />
                </div>
                <p className="text-sm font-bold text-[#023337] mb-1">
                  {stepConfig.title}
                </p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {stepConfig.instruction}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="flex gap-1 mt-4">
              {([1, 2, 3] as OnboardingStep[]).map((s) => (
                <div
                  key={s}
                  className={cn(
                    "flex-1 h-1 rounded-full transition-colors",
                    s < currentStep
                      ? "bg-orange-400"
                      : s === currentStep
                        ? "bg-orange-500"
                        : "bg-gray-200",
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── State 2b: desktop, element not yet located — show backdrop only ───────
  if (!targetRect) {
    return <>{Backdrop}</>;
  }

  // ── State 3: on target page, desktop, element found → spotlight + tooltip ─

  const pad = 10;
  const spot = {
    top: targetRect.top - pad,
    left: targetRect.left - pad,
    width: targetRect.width + pad * 2,
    height: targetRect.height + pad * 2,
  };

  const tooltipW = 288;

  // Decide tooltip placement: prefer right, fall back to left
  const spaceRight = window.innerWidth - spot.left - spot.width;
  const placeRight = spaceRight >= tooltipW + 24;
  const tooltipLeft = placeRight
    ? spot.left + spot.width + 18
    : spot.left - tooltipW - 18;

  // Clamp vertically so tooltip stays within viewport
  const tooltipH = 200;
  const rawTop = spot.top + spot.height / 2 - tooltipH / 2;
  const tooltipTop = Math.max(
    12,
    Math.min(rawTop, window.innerHeight - tooltipH - 12),
  );

  // 4-panel backdrop that surrounds the spotlight area, leaving the target
  // element itself uncovered. This avoids relying on z-index elevation of the
  // target element (which breaks inside overflow-y:auto containers in some
  // browsers) while still darkening everything outside the highlighted area.
  const panelProps = {
    className: "fixed z-50 pointer-events-auto",
    onWheel: handleBackdropWheel,
    onTouchStart: handleBackdropTouchStart,
    onTouchMove: handleBackdropTouchMove,
  };

  // The top panel must always be at least as tall as <main>'s offset from the
  // viewport top (i.e. the trial banner height). Without this, scrolling the
  // element near the top of <main> shrinks spot.top to ≤ 0 and the condition
  // fires false, leaving the trial banner uncovered.
  const mainOffsetTop =
    document.querySelector("main")?.getBoundingClientRect().top ?? 0;
  const topPanelHeight = Math.max(mainOffsetTop, spot.top);

  return (
    <>
      {Backdrop}
      {/* Top panel */}
      {topPanelHeight > 0 && (
        <div
          {...panelProps}
          style={{ top: 0, left: 0, right: 0, height: topPanelHeight }}
        />
      )}
      {/* Left panel */}
      {spot.left > 0 && (
        <div
          {...panelProps}
          style={{
            top: spot.top,
            left: 0,
            width: spot.left,
            height: spot.height,
          }}
        />
      )}
      {/* Right panel */}
      <div
        {...panelProps}
        style={{
          top: spot.top,
          left: spot.left + spot.width,
          right: 0,
          height: spot.height,
        }}
      />
      {/* Bottom panel */}
      <div
        {...panelProps}
        style={{ top: spot.top + spot.height, left: 0, right: 0, bottom: 0 }}
      />

      {/* Spotlight outline */}
      <div
        className="fixed z-[55] rounded-xl pointer-events-none"
        style={{
          top: spot.top,
          left: spot.left,
          width: spot.width,
          height: spot.height,
        }}
      />

      {/* Pulsing ring */}
      <div
        className="fixed z-[55] rounded-xl pointer-events-none animate-pulse"
        style={{
          top: spot.top - 4,
          left: spot.left - 4,
          width: spot.width + 8,
          height: spot.height + 8,
        }}
      />

      {/* Tooltip card */}
      <div
        className="fixed z-[65] bg-white rounded-xl shadow-2xl pointer-events-auto"
        style={{
          width: tooltipW,
          left: tooltipLeft,
          top: tooltipTop,
        }}
      >
        {/* Arrow pointing toward the spotlight */}
        {placeRight ? (
          <div
            className="absolute -left-2 top-1/2 -translate-y-1/2"
            style={{
              width: 0,
              height: 0,
              borderTop: "8px solid transparent",
              borderBottom: "8px solid transparent",
              borderRight: "8px solid white",
              filter: "drop-shadow(-1px 0 1px rgba(0,0,0,0.08))",
            }}
          />
        ) : (
          <div
            className="absolute -right-2 top-1/2 -translate-y-1/2"
            style={{
              width: 0,
              height: 0,
              borderTop: "8px solid transparent",
              borderBottom: "8px solid transparent",
              borderLeft: "8px solid white",
              filter: "drop-shadow(1px 0 1px rgba(0,0,0,0.08))",
            }}
          />
        )}

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon size={17} className="text-orange-500" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-orange-500 uppercase tracking-wide mb-0.5">
                {stepConfig.stepLabel}
              </p>
              <h3 className="text-sm font-bold text-[#023337] leading-snug">
                {stepConfig.title}
              </h3>
            </div>
          </div>

          <StepDots current={currentStep} />

          <p className="text-xs text-gray-500 leading-relaxed mt-3">
            {stepConfig.instruction}
          </p>

          {/* Progress bar */}
          <div className="flex gap-1 mt-4">
            {([1, 2, 3] as OnboardingStep[]).map((s) => (
              <div
                key={s}
                className={cn(
                  "flex-1 h-1 rounded-full transition-colors",
                  s < currentStep
                    ? "bg-orange-400"
                    : s === currentStep
                      ? "bg-orange-500"
                      : "bg-gray-200",
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
