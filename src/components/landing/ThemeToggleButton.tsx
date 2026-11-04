"use client";

import { useTheme } from "@/components/ThemeProvider";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

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
        "relative inline-flex h-6 w-12 shrink-0 cursor-pointer items-center rounded-full p-[2px] transition-colors duration-200 select-none border border-gray-200 bg-gray-100 hover:bg-gray-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        className,
      )}
    >
      {/* Track icons: Light (Sun) left, Dark (Moon) right */}
      <span
        className="grid h-full w-full grid-cols-2 items-center pointer-events-none"
        aria-hidden
      >
        <span className="flex items-center justify-center">
          <Sun
            className={cn(
              "h-3 w-3 transition-colors duration-200",
              isDark ? "text-gray-500" : "text-amber-500/30",
            )}
          />
        </span>
        <span className="flex items-center justify-center">
          <Moon
            className={cn(
              "h-3 w-3 transition-colors duration-200",
              isDark ? "text-amber-400/30" : "text-gray-400",
            )}
          />
        </span>
      </span>

      {/* Sliding Thumb */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-[2px] left-[2px] flex h-5 w-5 items-center justify-center rounded-full bg-surface shadow-xs border border-gray-200/60 transition-transform duration-200 ease-out",
          isDark
            ? "translate-x-6 text-amber-400"
            : "translate-x-0 text-amber-500",
        )}
      >
        {isDark ? (
          <Moon className="h-3 w-3 fill-amber-400/20" />
        ) : (
          <Sun className="h-3 w-3 fill-amber-500/20" />
        )}
      </span>
    </button>
  );
}
