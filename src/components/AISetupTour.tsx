"use client";

import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useNavigation } from "./NavigationProgressContext";
import { dismissTourForSession } from "@/services/aiSetup";

interface AISetupTourProps {
  onDismiss: () => void;
}

export default function AISetupTour({ onDismiss }: AISetupTourProps) {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(true);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const pathname = usePathname();
  const { navigate } = useNavigation();
  const userId = pathname.split("/")[1];

  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!mounted || isMobile) return;

    let attempts = 0;
    let cleanup: (() => void) | undefined;

    const findEl = () => {
      const el = document.getElementById("ai-settings-nav");
      if (el) {
        setTargetRect(el.getBoundingClientRect());
        const onResize = () => setTargetRect(el.getBoundingClientRect());
        window.addEventListener("resize", onResize);
        cleanup = () => window.removeEventListener("resize", onResize);
      } else if (attempts < 15) {
        attempts++;
        setTimeout(findEl, 150);
      }
    };

    findEl();
    return () => cleanup?.();
  }, [mounted, isMobile]);

  const handleSetupNow = () => {
    // dismissTourForSession();
    onDismiss();
    navigate(`/${userId}/ai-setup`);
  };

  const handleSkip = () => {
    // dismissTourForSession();
    onDismiss();
  };

  if (!mounted) return null;

  /* ── Mobile: centered modal ─────────────────────────────────────── */
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
          <div className="flex justify-end mb-1">
            <button
              onClick={handleSkip}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mb-5">
              <Sparkles size={30} className="text-orange-500" />
            </div>

            <h2 className="text-[17px] font-bold text-[#023337] mb-2">
              Set up your AI assistant
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-7">
              Connect an AI model to unlock smart features across your dashboard
              — from real-time insights to intelligent automation.
            </p>

            <button
              onClick={handleSetupNow}
              className="w-full py-3 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-colors cursor-pointer mb-3"
            >
              Set up now
            </button>
            <button
              onClick={handleSkip}
              className="w-full py-3 text-gray-500 text-sm font-medium hover:text-gray-700 transition-colors cursor-pointer"
            >
              Remind me later
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Desktop: spotlight + tooltip ──────────────────────────────── */
  if (!targetRect) return null;

  const pad = 6;
  const spot = {
    top: targetRect.top - pad,
    left: targetRect.left - pad,
    width: targetRect.width + pad * 2,
    height: targetRect.height + pad * 2,
  };

  // Clamp tooltip vertically so it stays within viewport
  const tooltipH = 210;
  const rawTop = spot.top + spot.height / 2;
  const tooltipTop = Math.min(
    Math.max(rawTop, tooltipH / 2 + 12),
    window.innerHeight - tooltipH / 2 - 12,
  );

  return (
    <>
      {/* Invisible backdrop — click anywhere outside the tooltip to skip */}
      <div className="fixed inset-0 z-40 cursor-default" onClick={handleSkip} />

      {/* Spotlight cut-out */}
      <div
        className="fixed z-50 rounded-lg pointer-events-none"
        style={{
          top: spot.top,
          left: spot.left,
          width: spot.width,
          height: spot.height,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.65)",
          outline: "2px solid #f97316",
          outlineOffset: "2px",
        }}
      />

      {/* Pulsing attention ring */}
      <div
        className="fixed z-50 rounded-lg pointer-events-none animate-pulse"
        style={{
          top: spot.top - 4,
          left: spot.left - 4,
          width: spot.width + 8,
          height: spot.height + 8,
          boxShadow: "0 0 0 3px rgba(249,115,22,0.35)",
        }}
      />

      {/* Tooltip */}
      <div
        className="fixed z-50 bg-white rounded-xl shadow-2xl w-72 p-5"
        style={{
          left: spot.left + spot.width + 18,
          top: tooltipTop,
          transform: "translateY(-50%)",
        }}
      >
        {/* Arrow pointing left toward the sidebar */}
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

        {/* Close */}
        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 p-0.5 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X size={14} />
        </button>

        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <Sparkles size={17} className="text-orange-500" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-orange-500 uppercase tracking-wide mb-0.5">
              Setup required
            </p>
            <h3 className="text-sm font-bold text-[#023337] leading-snug">
              Set up your AI assistant
            </h3>
          </div>
        </div>

        <p className="text-xs text-gray-500 leading-relaxed mb-4">
          Connect an AI model to unlock smart features — from real-time insights
          to intelligent automation across your dashboard.
        </p>

        <div className="flex gap-2">
          <button
            onClick={handleSetupNow}
            className="flex-1 py-2 bg-orange-500 text-white text-xs font-semibold rounded-lg hover:bg-orange-600 transition-colors cursor-pointer"
          >
            Set up now
          </button>
          <button
            onClick={handleSkip}
            className="flex-1 py-2 text-gray-500 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Skip for now
          </button>
        </div>
      </div>
    </>
  );
}
