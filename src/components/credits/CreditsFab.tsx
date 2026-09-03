"use client";

import { useCreditsModal } from "@/components/credits/CreditsModal";
import { useCredits } from "@/hooks/useCredits";
import { METER_EMPTY, METER_FILL } from "@/lib/creditMeter";

// The floating credit meter (2026-09-01) — bottom-right of the chat, above
// the thread, opening the credits panel.
//
// A ring rather than the header's bar, and it fills with SPENT: empty is a
// plain white disc with a border, and the orange closes around it as credits
// go. `used/total` sits underneath, because a ring can show a proportion but
// cannot say what the two numbers are.
//
// DESKTOP ONLY (`lg`), and that is a layout fact rather than a preference.
// The composer is an in-flow row at the bottom of the chat column and takes
// the full width on small screens, where a floating badge would both cover
// the send button and eat scarce reading width. Below `lg` the same meter
// stays in the header instead, which is why ChatHeader's copy is `lg:hidden`
// — between them exactly one is visible at any width.
//
// The white disc is not decoration: this floats over conversation text, and a
// ring drawn straight onto the thread would sit on whatever happened to be
// behind it. The border and the shadow are what make it read as an object in
// front of the page rather than a mark on it.

const SIZE = 44;
const STROKE = 5;
const RADIUS = (SIZE - STROKE) / 2 - 0.5;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CreditsFab() {
  const { balance, used } = useCredits();
  const { open } = useCreditsModal();

  if (balance === null) return null;

  const spent = Math.max(used, 0);
  const total = Math.max(balance, 0) + spent;
  const pct = total > 0 ? Math.min(spent / total, 1) : 0;
  const dash = CIRCUMFERENCE * pct;

  return (
    <button
      type="button"
      onClick={open}
      title={`${spent} of ${total} Velte credits used`}
      aria-label={`${spent} of ${total} credits used. Open credits.`}
      // `fixed`, not `sticky` — the chat shell is `h-dvh overflow-hidden` and
      // the scrolling happens in an inner container, which is exactly the
      // situation sticky cannot anchor against.
      //
      // ABOVE the composer, not in the true corner, and the difference is
      // measured rather than taste. The composer is centred at max-w-4xl
      // inside the column left of the sidebar, so the free gutter beside it is
      // 32px at 1024, 52px at 1280 and only reaches this control's ~92px at
      // about 1400. Anywhere narrower, a corner-pinned badge sits exactly on
      // the send button. 7rem clears the composer row (~92px including its own
      // safe-area padding) with room to spare, at every width, and it still
      // reads as the bottom-right of the page.
      className="fixed right-6 bottom-[calc(env(safe-area-inset-bottom)+7rem)] z-30 hidden cursor-pointer flex-col items-center gap-1 rounded-2xl border border-gray-200 bg-white px-2.5 py-2 shadow-lg transition-shadow hover:shadow-xl lg:flex"
    >
      <span
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={spent}
        aria-label="Credits used"
        className="block"
      >
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          // Starts the arc at twelve o'clock, where the eye starts on
          // anything circular.
          className="-rotate-90"
          aria-hidden="true"
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="#ffffff"
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

      {/* The two numbers the ring cannot say. Tabular here, unlike the panel's
          hero figure — these are small, and a digit changing width as the
          count ticks over would make the whole control twitch. */}
      <span className="text-[11px] leading-none font-semibold tabular-nums text-[#023337]">
        {spent}/{total}
      </span>
    </button>
  );
}
