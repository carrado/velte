// A Shopping Plan's own budget ring (2026-09-11) — same drawing technique as
// CreditsDonut (one arc, rotated to start at 12 o'clock, round caps), but
// deliberately its own component rather than a reskin of that one: a credit
// meter always fills orange-for-spent because "spent" is neutral there, but
// a plan's spent-vs-budget ratio is either good or bad news, and the whole
// point of this mark is to carry that verdict at a glance — green comfortably
// under, amber close to the line, red over it, matching the exact thresholds
// ShoppingPlanTemplate.tsx's own banner already uses (`overBudget`) so the
// ring and the words never disagree.
//
// A ratio over 100% (over budget) still draws a full ring — there is no
// "spilling past the edge" to show on a closed circle — but the colour and
// the caption underneath carry the rest of that story.

import { formatNaira } from "@/lib/utils";

const SIZE = 132;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2 - 1;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const TRACK = "#e5e7eb"; // gray-200 — same neutral rail every meter in this app uses.

export function BudgetGauge({
  spentKobo,
  totalBudgetKobo,
}: {
  spentKobo: number;
  totalBudgetKobo: number;
}) {
  const ratio = totalBudgetKobo > 0 ? spentKobo / totalBudgetKobo : 0;
  const overBudget = spentKobo > totalBudgetKobo;
  // Comfortably under 80% reads as healthy; the last stretch to the line
  // gets a heads-up amber before it actually crosses into red — the same
  // three-state story the banner tells in words, just drawn a beat earlier.
  const fill = overBudget ? "#dc2626" : ratio >= 0.8 ? "#d97706" : "#059669";
  const fraction = Math.min(1, ratio);
  const dash = CIRCUMFERENCE * fraction;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[132px]">
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={`${formatNaira(spentKobo)} spent of ${formatNaira(totalBudgetKobo)} budget`}
          className="-rotate-90"
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={TRACK}
            strokeWidth={STROKE}
          />
          {fraction > 0 && (
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={fill}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
              className="transition-[stroke-dasharray] duration-500 ease-out"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
          <span className="text-xl font-bold leading-tight text-ink">
            {formatNaira(spentKobo)}
          </span>
          <span className="mt-0.5 text-[11px] font-medium text-gray-400">
            of {formatNaira(totalBudgetKobo)}
          </span>
        </div>
      </div>
      <p className="mt-2 text-xs font-semibold" style={{ color: fill }}>
        {overBudget
          ? `${formatNaira(spentKobo - totalBudgetKobo)} over budget`
          : `${formatNaira(totalBudgetKobo - spentKobo)} left`}
      </p>
    </div>
  );
}
