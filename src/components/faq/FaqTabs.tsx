"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export type FaqTabKey = "all" | "buyer" | "vendor";

// Underline indicator, not a filled sliding pill — that pill-spring
// mechanism belongs to How It Works' buyer/seller toggle now (see that
// page's own file comment); FAQ needed its own distinct interaction once
// this page actually got redesigned instead of just being left alone.
export default function FaqTabs({
  active,
  onChange,
  counts,
}: {
  active: FaqTabKey;
  onChange: (key: FaqTabKey) => void;
  counts: Record<FaqTabKey, number>;
}) {
  const tabs: { key: FaqTabKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "buyer", label: "For buyers" },
    { key: "vendor", label: "For vendors" },
  ];

  return (
    <div className="inline-flex items-center gap-6 border-b border-gray-200">
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={cn(
              "relative cursor-pointer pb-3 text-sm font-semibold transition-colors duration-200 whitespace-nowrap flex items-center gap-1.5",
              isActive ? "text-[#023337]" : "text-gray-400 hover:text-gray-600",
            )}
          >
            {tab.label}
            <span
              className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-colors duration-200",
                isActive
                  ? "bg-orange-100 text-orange-700"
                  : "bg-gray-100 text-gray-400",
              )}
            >
              {counts[tab.key]}
            </span>
            {isActive && (
              <motion.span
                layoutId="faq-tab-underline"
                transition={{ type: "spring", stiffness: 450, damping: 34 }}
                className="absolute left-0 right-0 -bottom-px h-[2.5px] bg-orange-500 rounded-full"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
