import { SignalIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

// The "broadcasting" progress icon shared by the in-turn plan card, the
// Your Plans list, and the plan detail page (2026-09-10) — one small
// component so all three read the same color at the same ratio rather than
// three hand-rolled copies drifting apart.
//
// Red → yellow → green on how much of the checklist has been ATTEMPTED
// (found or no_match — see ShoppingPlanSummary's own resolvedCount comment),
// never on how much was actually found: a plan that finished with 9 of 11
// items no_match is DONE, not failing, and should read green — the amber
// "found X of Y" messaging (ShoppingPlanTemplate's own banner) is what
// carries that nuance, not this icon's color.
export type PlanProgressColor = "red" | "yellow" | "green";

export function planProgressColor(
  resolvedCount: number,
  itemCount: number,
): PlanProgressColor {
  if (itemCount <= 0 || resolvedCount <= 0) return "red";
  if (resolvedCount >= itemCount) return "green";
  return "yellow";
}

const COLOR_CLASSES: Record<PlanProgressColor, string> = {
  red: "text-red-500",
  yellow: "text-amber-500",
  green: "text-emerald-500",
};

/** How far through the checklist the background search is — a real ratio of
 *  items ATTEMPTED over items total, never a timer creeping forward on its
 *  own. Shared by the in-chat plan card and the Your Plans list so one
 *  number can't be drawn two different ways. */
export function PlanProgressBar({
  resolvedCount,
  itemCount,
  className,
}: {
  resolvedCount: number;
  itemCount: number;
  className?: string;
}) {
  const pct =
    itemCount > 0
      ? Math.min(
          100,
          Math.max(0, Math.round((resolvedCount / itemCount) * 100)),
        )
      : 0;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={itemCount}
        aria-valuenow={resolvedCount}
        aria-label={`${resolvedCount} of ${itemCount} items checked`}
        className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100"
      >
        <div
          className="h-full rounded-full bg-orange-500 transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* Tabular so the row doesn't twitch sideways as the count ticks up. */}
      <span className="shrink-0 text-[11px] font-semibold tabular-nums text-gray-500">
        {resolvedCount}/{itemCount}
      </span>
    </div>
  );
}

export function ShoppingPlanProgressIcon({
  resolvedCount,
  itemCount,
  size = 18,
  className,
}: {
  resolvedCount: number;
  itemCount: number;
  size?: number;
  className?: string;
}) {
  const color = planProgressColor(resolvedCount, itemCount);
  return (
    <SignalIcon
      size={size}
      // Pulses the whole time it's meaningfully "in progress" (red/yellow);
      // once green the build is done, so the animation stops reading as
      // "still working" and would otherwise be a stray, purposeless motion
      // on a finished result.
      className={cn(
        COLOR_CLASSES[color],
        color !== "green" && "animate-pulse",
        className,
      )}
      aria-hidden="true"
    />
  );
}
