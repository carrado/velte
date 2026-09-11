"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "@/components/icons";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { THEME_PREFERENCES, type ThemePreference } from "@/lib/theme";

// The appearance control (2026-09-10).
//
// A THREE-way segmented control, not a two-way switch, because "follow my
// device" is a real choice and not just the starting value — a buyer who
// taps Dark on a bright afternoon needs a way back to "do what my phone
// does", and a binary toggle silently takes that away forever.
//
// Segmented rather than a dropdown: three short options, all worth showing at
// once, and on a phone a segmented row is one tap instead of two.

const OPTIONS: Record<
  ThemePreference,
  { label: string; Icon: typeof SunIcon; hint: string }
> = {
  system: {
    label: "System",
    Icon: MonitorIcon,
    hint: "Match my device setting",
  },
  light: { label: "Light", Icon: SunIcon, hint: "Always light" },
  dark: { label: "Dark", Icon: MoonIcon, hint: "Always dark" },
};

export function ThemeToggle({
  className,
  /** Labels hidden on the narrowest screens where the control shares a row
   *  with other things (the chat header); the icons still carry it, and the
   *  accessible name is on the button either way. */
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { preference, setPreference } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Appearance"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-xl border border-gray-200 bg-gray-50 p-0.5",
        className,
      )}
    >
      {THEME_PREFERENCES.map((option) => {
        const { label, Icon, hint } = OPTIONS[option];
        // Safe to read directly: the provider reads the stored preference
        // through `useSyncExternalStore`, which hydrates with the server's
        // neutral value and re-renders with the real one — so this can't be
        // the source of a hydration mismatch.
        const selected = preference === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            title={hint}
            onClick={() => setPreference(option)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors",
              selected
                ? "bg-surface text-ink shadow-sm"
                : "text-gray-500 hover:text-gray-700",
            )}
          >
            <Icon size={15} className="shrink-0" />
            <span className={cn(compact && "sr-only sm:not-sr-only")}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
