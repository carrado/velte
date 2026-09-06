"use client";

import { METER_EMPTY, METER_FILL } from "@/lib/creditMeter";

// The credit meter (2026-08-31) — replaces the "what things cost" price list
// as the thing the panel leads with.
//
// A price list answers a question nobody opened this panel to ask. The
// question they DID open it for is "how much have I got left", and that is a
// single ratio against a limit — so this is a METER drawn as a ring, not a
// two-slice pie: one arc, which spares the reader comparing two areas to
// learn a number they can simply be told.
//
// The arc fills with SPENT (2026-09-01), matching the composer bar and the
// floating ring — all three are the same fact, and two of them filling one
// way while the third filled the other meant opening this panel could show a
// nearly-empty ring a moment after tapping a nearly-full bar.
//
// The number in the middle is still the BALANCE, and that pairing is
// deliberate rather than an oversight: the orange is what has been burned,
// the figure is what is left to spend, and the line underneath names both.
// This panel exists for the decision to top up, and what remains is the
// number that decision is made on.
//
// Colours come from lib/creditMeter.ts, shared with the other meters so they
// cannot drift — see that file for what each was checked against.
//
// The ring never carries meaning alone: the balance is written in the middle
// and the split is spelled out underneath, so the arc is a glance-level
// summary of something already stated in words.

const SIZE = 160;
const STROKE = 14;
/** Inset by a pixel so the stroke's outer edge sits just inside the viewBox
 *  rather than exactly on it — flush is arithmetically fine and still loses a
 *  hairline to antialiasing on some displays. */
const RADIUS = (SIZE - STROKE) / 2 - 1;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CreditsDonut({
  balance,
  used,
  isGuest,
}: {
  /** Credits remaining. Null while it is still being read. */
  balance: number | null;
  /** Credits already spent. For a guest this is derived from their starting
   *  allowance, since the browser only stores what is left. */
  used: number;
  isGuest: boolean;
}) {
  const known = balance !== null;
  const remaining = known ? Math.max(balance, 0) : 0;
  const spent = Math.max(used, 0);
  const total = remaining + spent;

  // An account with nothing ever granted has no ratio to draw — the ring
  // shows as an empty track rather than a full or a broken one.
  const fraction = total > 0 ? spent / total : 0;
  const dash = CIRCUMFERENCE * fraction;

  return (
    <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
      <div className="relative mx-auto w-[160px]">
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={
            known
              ? `${spent} of ${total} credits used, ${remaining} remaining`
              : "Reading your credit balance"
          }
          // Rotated so the arc starts at twelve o'clock, which is where a
          // reader's eye starts on anything circular.
          className="-rotate-90"
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={METER_EMPTY}
            strokeWidth={STROKE}
          />
          {fraction > 0 && (
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={METER_FILL}
              strokeWidth={STROKE}
              // Round caps do the job a 2px surface gap does on a stacked
              // bar: they keep the arc's ends readable where it meets the
              // track, without drawing a border around the mark.
              strokeLinecap="round"
              strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
              className="transition-[stroke-dasharray] duration-500 ease-out"
            />
          )}
        </svg>

        {/* The figure the panel leads with. Proportional figures, not
            tabular: tabular-nums gives every digit the width of a zero, which
            makes a large standalone number look gappy. */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl leading-none font-bold text-[#023337]">
            {known ? remaining : "—"}
          </span>
          <span className="mt-1.5 text-xs font-medium tracking-wide text-gray-500 uppercase">
            {remaining === 1 ? "credit" : "credits"}
          </span>
        </div>
      </div>

      {/* The split in words. The ring is a glance; this is the fact — so
          nothing here is carried by colour alone.
          //
          // A GUEST at zero is told to sign in, never to "top up" — the pack
          // grid is signed-in only (see CreditsPanel), so a guest has no top-up
          // to reach for yet. No separate bonus line underneath any more
          // (2026-09-06): signing in no longer grants anything on its own —
          // see credits.ts's own note on dropping SIGNUP_CREDITS — so there is
          // no number left to pitch here that CreditsPanel's own sign-in
          // section below doesn't already say better. */}
      <p className="mt-4 text-sm text-gray-600">
        {!known
          ? "Checking…"
          : total === 0
            ? "No credits yet"
            : remaining === 0
              ? isGuest
                ? `All ${total} used — sign in to keep going`
                : `All ${total} used — top up to keep going`
              : `${spent} used · ${remaining} left`}
      </p>
    </div>
  );
}
