"use client";

import { cn } from "@/lib/utils";
import type { TabItem } from "@/types/common";

interface TabBarProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (tab: T) => void;
  className?: string;
  /** Stretch to the container width (chat sidebar theme control, Hub mobile). */
  fullWidth?: boolean;
  /** `lg` = taller padding + text-sm (product detail). Default stays compact. */
  size?: "default" | "lg";
}

/**
 * App-standard segmented tabs. Use this for any tab-like switcher
 * (store, marketplace, hub, product detail, chat sidebar theme control).
 * Shell: `border-gray-200 bg-gray-50`, active `bg-surface` + shadow.
 */
export default function TabBar<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  className,
  fullWidth = false,
  size = "default",
}: TabBarProps<T>) {
  const large = size === "lg";
  return (
    <div
      role="tablist"
      className={cn(
        "flex items-center border border-gray-200 bg-gray-50",
        large
          ? "gap-1 rounded-xl p-1 sm:rounded-2xl"
          : "gap-0.5 rounded-lg p-0.5 sm:rounded-xl",
        fullWidth ? "w-full" : "w-full sm:w-auto sm:inline-flex",
        className,
      )}
    >
      {tabs.map((tab) => {
        const selected = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.key)}
            className={cn(
              "flex items-center justify-center font-semibold transition-colors cursor-pointer whitespace-nowrap",
              fullWidth || large ? "flex-1" : "flex-1 sm:flex-none",
              large
                ? "gap-2 rounded-lg px-4 py-2.5 text-sm sm:rounded-xl sm:px-5 sm:py-3"
                : "gap-1.5 rounded-md px-2.5 py-1.5 text-xs sm:rounded-lg",
              selected
                ? "bg-surface text-ink shadow-sm"
                : "text-gray-500 hover:text-gray-700",
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "font-bold",
                  selected ? "text-orange-500" : "text-gray-400",
                )}
              >
                ({tab.count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
