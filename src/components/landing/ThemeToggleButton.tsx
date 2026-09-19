"use client";

import { useTheme } from "@/components/ThemeProvider";
import { MoonIcon, SunIcon } from "@/components/icons/hero";
import { cn } from "@/lib/utils";

// Public-header light/dark switch (2026-09-17). Deliberately a plain
// two-state icon button here, not the dashboard's three-way ThemeToggle
// (System / Light / Dark) — that control exists to protect a signed-in
// vendor's "follow my device" preference across sessions, but a buyer
// landing on a marketing page cold has no existing preference to protect,
// and there's no room next to Sign in / Join for a segmented control
// anyway. One tap flips the resolved theme; the choice still persists via
// ThemeProvider's own storage, same as everywhere else in the app — it
// just starts from "system" and only ever needs to move one step.
export function ThemeToggleButton({ className }: { className?: string }) {
  const { resolved, setPreference } = useTheme();
  const isDark = resolved === "dark";

  return (
    <button
      type="button"
      onClick={() => setPreference(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "w-10 h-10 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer",
        className,
      )}
    >
      {isDark ? <SunIcon size={19} /> : <MoonIcon size={19} />}
    </button>
  );
}
