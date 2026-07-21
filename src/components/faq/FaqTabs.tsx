"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export type FaqTabKey = "all" | "buyer" | "vendor";

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
    <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white border border-gray-200 shadow-sm">
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={cn(
              "relative cursor-pointer rounded-full px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold transition-colors duration-200 whitespace-nowrap",
              isActive ? "text-white" : "text-gray-500 hover:text-[#023337]",
            )}
          >
            {isActive && (
              <motion.span
                layoutId="faq-tab-pill"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
                className="absolute inset-0 rounded-full bg-orange-500 shadow-md shadow-orange-500/30"
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {tab.label}
              <span
                className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-400",
                )}
              >
                {counts[tab.key]}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
