"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, UserCog, PackagePlus } from "lucide-react";
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
    Icon: UserCog,
    badge: "Step 1 of 2",
    stepLabel: "Step 1 of 2",
    title: "Profile & Location",
    description:
      "Buyers are matched to vendors by distance, so we need to know where you are. Fill in your business details and set your location.",
    targetPath: "settings",
    targetElementId: "profile-section",
    ctaLabel: "Go to Settings",
    instruction:
      'Fill in your business name and area, then click "Use my current location" and Save Profile.',
  },
  2: {
    Icon: PackagePlus,
    badge: "Final Step",
    stepLabel: "Step 2 of 2",
    title: "Add Your First Product",
    description:
      "Buyers can only be matched to products you've listed. Add at least one product to your catalog to start appearing in search.",
    targetPath: "products",
    targetElementId: "add-product-button",
    ctaLabel: "Go to Products",
    instruction: 'Click "Add Product" and fill in your first listing.',
  },
} as const;

// ── Progress dots ─────────────────────────────────────────────────────────────

function StepDots({ current }: { current: OnboardingStep }) {
  return (
    <div className="flex items-center gap-1.5">
      {([1, 2] as OnboardingStep[]).map((s) => (
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
  const { currentStep, isComplete, initialized } = useOnboardingStore();
  const user = useUserStore((state) => state.user);
  const pathname = usePathname();
  const { navigate } = useNavigation();

  const userId = pathname.split("/")[1];
  const stepConfig = STEPS[currentStep];

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
        const initialRect = el.getBoundingClientRect();
        if (initialRect.top < window.innerHeight && initialRect.bottom > 0) {
          setTargetRect(initialRect);
        }

        const mainEl = document.querySelector("main") as HTMLElement | null;

        const observer = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting) updateRect();
          },
          { root: mainEl, threshold: 0.1 },
        );
        observer.observe(el);

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
    const timer = setTimeout(() => {
      const el = document.getElementById(stepConfig.targetElementId);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 500);
    return () => clearTimeout(timer);
  }, [onTargetPage, currentStep, stepConfig.targetElementId]);

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
            Your store is ready. Buyers searching nearby can now find your
            products.
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

  if (!mounted || !initialized || !user || !user.onboarding) return null;

  const { Icon } = stepConfig;

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
            <div className="flex items-center justify-between mb-5">
              <StepDots current={currentStep} />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {stepConfig.stepLabel}
              </span>
            </div>

            <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mb-5">
              <Icon size={30} className="text-orange-500" />
            </div>

            <p className="text-xs font-semibold text-orange-500 uppercase tracking-wide mb-1">
              {stepConfig.badge}
            </p>

            <h2 className="text-[17px] font-bold text-[#023337] mb-2 leading-snug">
              {stepConfig.title}
            </h2>

            <p className="text-sm text-gray-500 leading-relaxed mb-7">
              {stepConfig.description}
            </p>

            <button
              onClick={handleNavigate}
              className="w-full flex items-center justify-center gap-2 py-3 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-colors cursor-pointer"
            >
              {stepConfig.ctaLabel}
              <ArrowRight size={16} />
            </button>

            <div className="flex gap-1.5 mt-5">
              {([1, 2] as OnboardingStep[]).map((s) => (
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

            <div className="flex gap-1 mt-4">
              {([1, 2] as OnboardingStep[]).map((s) => (
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

  const spaceRight = window.innerWidth - spot.left - spot.width;
  const placeRight = spaceRight >= tooltipW + 24;
  const tooltipLeft = placeRight
    ? spot.left + spot.width + 18
    : spot.left - tooltipW - 18;

  const tooltipH = 200;
  const rawTop = spot.top + spot.height / 2 - tooltipH / 2;
  const tooltipTop = Math.max(
    12,
    Math.min(rawTop, window.innerHeight - tooltipH - 12),
  );

  const panelProps = {
    className: "fixed z-50 pointer-events-auto",
    onWheel: handleBackdropWheel,
    onTouchStart: handleBackdropTouchStart,
    onTouchMove: handleBackdropTouchMove,
  };

  const mainOffsetTop =
    document.querySelector("main")?.getBoundingClientRect().top ?? 0;
  const topPanelHeight = Math.max(mainOffsetTop, spot.top);

  return (
    <>
      {Backdrop}
      {topPanelHeight > 0 && (
        <div
          {...panelProps}
          style={{ top: 0, left: 0, right: 0, height: topPanelHeight }}
        />
      )}
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
      <div
        {...panelProps}
        style={{
          top: spot.top,
          left: spot.left + spot.width,
          right: 0,
          height: spot.height,
        }}
      />
      <div
        {...panelProps}
        style={{ top: spot.top + spot.height, left: 0, right: 0, bottom: 0 }}
      />

      <div
        className="fixed z-[55] rounded-xl pointer-events-none"
        style={{
          top: spot.top,
          left: spot.left,
          width: spot.width,
          height: spot.height,
        }}
      />

      <div
        className="fixed z-[55] rounded-xl pointer-events-none animate-pulse"
        style={{
          top: spot.top - 4,
          left: spot.left - 4,
          width: spot.width + 8,
          height: spot.height + 8,
        }}
      />

      <div
        className="fixed z-[65] bg-white rounded-xl shadow-2xl pointer-events-auto"
        style={{
          width: tooltipW,
          left: tooltipLeft,
          top: tooltipTop,
        }}
      >
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

          <div className="flex gap-1 mt-4">
            {([1, 2] as OnboardingStep[]).map((s) => (
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
