"use client";

import { cn } from "@/lib/utils";
import type { TabItem } from "@/types/common";

interface TabBarProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (tab: T) => void;
  className?: string;
}

export default function TabBar<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  className,
}: TabBarProps<T>) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-1 md:flex md:flex-row w-full md:w-auto bg-orange-50 rounded-lg sm:p-1 p-2",
        className,
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md cursor-pointer text-dash-body font-medium transition-colors whitespace-nowrap",
            activeTab === tab.key
              ? "bg-white text-[#111827] shadow-sm"
              : "text-[#4b5563] hover:text-[#111827]",
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="text-dash-secondary font-bold text-orange-500">
              ({tab.count})
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
