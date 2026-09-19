"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "@/components/icons/hero";
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
   *  accessible name is on the button either way. Meaningless in a container
   *  that never renders below the `sm` breakpoint in the first place (the
   *  vendor dashboard's `lg:flex` sidebar, or a `md:block` popover) — `sm:`
   *  is already satisfied the moment either exists, so use `iconOnly` there
   *  instead. */
  compact = false,
  /** Labels hidden ALWAYS, regardless of viewport (2026-09-18) — for a
   *  container too narrow for even the tightened `size="sm"` labels (the
   *  account popover's 192px). */
  iconOnly = false,
  /** Icon/padding/gap/text sizing. `sm` is what fits three full labels
   *  inside the vendor dashboard's fixed 260px sidebar rail (2026-09-18) —
   *  `compact`/`iconOnly` drop the labels entirely; this keeps them and
   *  shrinks everything else instead, per explicit request not to lose the
   *  text there. */
  size = "md",
  /** Force `w-full` at every viewport (2026-09-18) — the default below is
   *  `w-full` only up to `sm` (a phone-width Settings page should still get
   *  a full-bleed control), auto-width above it (a pill, not a full-bleed
   *  bar, is the normal look once there's room). The vendor/chat sidebars
   *  and the header's account popover render ONLY at desktop widths, where
   *  that default would shrink them back to auto-width — this keeps them
   *  full-bleed regardless. Deliberately a prop, not a `w-full` passed
   *  through `className`: both would target the same `width` property at
   *  equal specificity, and which one wins is decided by Tailwind's
   *  generated CSS order, not by the order classes happen to appear in the
   *  string — not something to depend on. */
  fullWidth = false,
  /** Force auto-width (a pill, never a full-bleed bar) at every viewport,
   *  centred in its own container (2026-09-18) — the opposite override from
   *  `fullWidth`, for a spot that wants the compact look even on the phone
   *  widths where the default below would otherwise stretch it full-bleed
   *  (Settings' own "Appearance" card, now mobile-only). */
  autoWidth = false,
}: {
  className?: string;
  compact?: boolean;
  iconOnly?: boolean;
  size?: "sm" | "md";
  fullWidth?: boolean;
  autoWidth?: boolean;
}) {
  const { preference, setPreference } = useTheme();
  const sm = size === "sm";

  return (
    <div
      role="radiogroup"
      aria-label="Appearance"
      className={cn(
        "flex items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 p-0.5",
        fullWidth && "w-full",
        autoWidth && "mx-auto w-auto inline-flex",
        !fullWidth && !autoWidth && "w-full sm:w-auto sm:inline-flex",
        "sm:rounded-xl",
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
              "flex items-center justify-center rounded-md font-semibold transition-colors",
              sm
                ? "gap-1 px-1.5 py-1 text-[11px]"
                : "gap-1.5 px-2.5 py-1.5 text-xs",
              "sm:rounded-lg",
              selected
                ? "bg-surface text-ink shadow-sm"
                : "text-gray-500 hover:text-gray-700",
            )}
          >
            <Icon size={sm ? 13 : 15} className="shrink-0" />
            <span
              className={cn(
                iconOnly ? "sr-only" : compact && "sr-only sm:not-sr-only",
              )}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
