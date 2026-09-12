"use client";

import { useCreditsModal } from "@/components/credits/CreditsModal";
import { useCredits } from "@/hooks/useCredits";
import { METER_EMPTY, METER_FILL } from "@/lib/creditMeter";

// The credit meter's MOBILE home (2026-09-12) — moved out of the composer's
// own row (CreditsBar, deleted) and into the conversation sidebar, drawn as
// a donut ring matching CreditsFab's desktop shape instead of a bar.
// `lg:hidden`, mirroring CreditsFab's own `hidden lg:flex` — exactly one
// meter is ever visible at a given width, never both at once.
//
// Rendered OUTSIDE ConversationSidebar's `buyer &&` gate (see that file) —
// it shows even signed out. A guest watching a five-credit allowance drain
// is exactly who a meter is for (see the deleted CreditsBar's own header
// comment on this), and the buyer-only menu section below it renders for
// neither a guest nor a vendor without a buyer cookie.
//
// A near-identical idea — a meter row inside the buyer-gated menu — was
// tried and reverted 2026-09-01, for two reasons that don't apply here:
// it would have duplicated the header's own copy (the header carries none
// any more, just a Top up CTA — see ChatHeader's own comment), and reading
// it meant opening the drawer regardless of where in the drawer it sat.
// This IS the mobile surface now — there's no longer a composer-row copy
// for it to sit behind.

const SIZE = 40;
const STROKE = 4.5;
const RADIUS = (SIZE - STROKE) / 2 - 0.5;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CreditsSidebarMeter() {
  const { balance, used } = useCredits();
  const { open } = useCreditsModal();

  if (balance === null) return null;

  const remaining = Math.max(balance, 0);
  const spent = Math.max(used, 0);
  const total = remaining + spent;
  const pct = total > 0 ? Math.min(spent / total, 1) : 0;
  const dash = CIRCUMFERENCE * pct;

  return (
    <button
      type="button"
      onClick={open}
      title={`${spent} of ${total} Velte credits used`}
      aria-label={`${spent} of ${total} credits used. Open credits.`}
      className="mx-3 mb-3 flex w-[calc(100%-1.5rem)] shrink-0 cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-surface px-3 py-2.5 text-left transition-colors hover:border-orange-200 hover:bg-orange-50/40 lg:hidden"
    >
      <span
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={spent}
        aria-label="Credits used"
        className="block shrink-0"
      >
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          // Starts the arc at twelve o'clock, same as the other two meters.
          className="-rotate-90"
          aria-hidden="true"
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={METER_EMPTY}
            strokeWidth={STROKE}
          />
          {dash > 0 && (
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={METER_FILL}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
              className="transition-[stroke-dasharray] duration-500 ease-out"
            />
          )}
        </svg>
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">
          {remaining} credit{remaining === 1 ? "" : "s"} left
        </span>
        <span className="block text-[11px] text-gray-400">
          {spent} of {total} used
        </span>
      </span>
    </button>
  );
}
