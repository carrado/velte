"use client";

import { motion, AnimatePresence } from "motion/react";
import type { FaqTabKey } from "./FaqTabs";
import { PlusIcon } from "@/components/icons";

// Real questions from src/lib/faqs.ts, not invented copy for the mockup.
const preview: Record<Exclude<FaqTabKey, "all">, { q: string; a: string }> = {
  buyer: {
    q: "What is Velte?",
    a: "An AI shopping agent — describe what you need and it searches real vendor inventory nearby to find it.",
  },
  vendor: {
    q: "How do I get discovered by buyers?",
    a: "List your business and buyers searching nearby are matched to you automatically — no ads, no bidding.",
  },
};

// Redesigned 2026-08-17 — was two tilted Unsplash photos with a float +
// ShineSweep treatment, which is the exact recipe About's "Our Story"
// section uses for its own real photo (see that page's file comment about
// owning the photo-led identity). This page's visual now previews its own
// content instead — a small stack of mock FAQ cards, same rounded-2xl/
// accent-bar/ghost-number grammar as the real FaqCard list below, so the
// hero reads as "here's a taste of what you're about to scroll through"
// rather than borrowing another page's signature move.
function MockCard({
  q,
  a,
  className,
  delay = 0,
}: {
  q: string;
  a: string;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay }}
      className={`absolute w-[280px] rounded-2xl bg-white border border-gray-200 shadow-xl shadow-gray-300/40 p-5 ${className ?? ""}`}
    >
      <span
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl bg-gradient-to-b from-orange-400 to-orange-600"
      />
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="font-semibold text-[#023337] text-sm leading-snug">{q}</p>
        <span className="grid place-items-center w-6 h-6 rounded-full bg-orange-500 shrink-0">
          <PlusIcon className="w-3.5 h-3.5 text-white rotate-45" />
        </span>
      </div>
      <p className="text-gray-400 text-xs leading-relaxed line-clamp-2">{a}</p>
    </motion.div>
  );
}

export default function FaqHeroVisual({ tab }: { tab: FaqTabKey }) {
  return (
    <div className="relative h-64 sm:h-80 lg:h-[420px] mt-2 lg:mt-0">
      <AnimatePresence mode="wait">
        {tab === "vendor" ? (
          <motion.div
            key="vendor"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0"
          >
            <MockCard
              {...preview.vendor}
              className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-2"
              delay={0.3}
            />
          </motion.div>
        ) : (
          <motion.div
            key={tab === "buyer" ? "buyer" : "all"}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0"
          >
            <MockCard
              {...preview.buyer}
              className="left-[8%] top-[18%] -rotate-3"
            />
            {tab === "all" && (
              <MockCard
                {...preview.vendor}
                className="right-[4%] bottom-[12%] rotate-2"
                delay={0.5}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
