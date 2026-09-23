"use client";

import { useTheme } from "@/components/ThemeProvider";
import { MoonIcon, SunIcon } from "@/components/icons/hero";
import { cn } from "@/lib/utils";

// Public-header light/dark switch (2026-09-17). Deliberately two-state, not
// the dashboard's three-way ThemeToggle (System / Light / Dark) — that
// control exists to protect a signed-in vendor's "follow my device"
// preference across sessions, but a buyer landing on a marketing page cold
// has no existing preference to protect, and there's no room next to
// Sign in / Join for a segmented control anyway. One tap flips the resolved
// theme; the choice still persists via ThemeProvider's own storage, same as
// everywhere else in the app — it just starts from "system" and only ever
// needs to move one step.
//
// A sliding switch since 2026-09-23 (was a plain sun/moon icon button): the
// thumb's position says which mode is on, where the old icon showed the mode
// you'd switch TO — easy to misread. The track is grey-200, which the dark
// ramp inverts on its own, so it needs no dark: variant.
export function ThemeToggleButton({ className }: { className?: string }) {
  const { resolved, setPreference } = useTheme();
  const isDark = resolved === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={() => setPreference(isDark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-gray-200 p-1 sm:h-6 sm:w-11 sm:p-0.5 transition-colors hover:bg-gray-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full bg-surface shadow-sm transition-transform duration-300 ease-out",
          isDark
            ? "translate-x-5 text-orange-400"
            : "translate-x-0 text-orange-500",
        )}
      >
        {isDark ? <MoonIcon size={12} /> : <SunIcon size={12} />}
      </span>
    </button>
  );
}
