"use client";

import { useCreditsModal } from "@/components/credits/CreditsModal";
import { useCredits } from "@/hooks/useCredits";
import { METER_EMPTY, METER_FILL } from "@/lib/creditMeter";

// The credit meter, in the composer's own button row (2026-09-01).
//
// This is the MOBILE home for the gauge, and the row was chosen because it
// already had the space: the composer's controls sit in a `justify-between`
// row holding exactly two things, the camera on the left and send on the
// right, with ~224px of nothing between them on a 360px phone. Filling it
// costs no vertical space at all, which on the one screen where height is
// scarcest is the whole argument.
//
// It also puts the balance at the point of spend. Every credit this counts is
// consumed by the button 40px to its right, and that is the second in which
// the number is worth reading — not in a nav drawer.
//
// Why not the alternatives that were tried or considered:
//   - The HEADER carried it until today and made a phone row of logo, menu
//     toggle and identity chip into one thing too many.
//   - The SIDEBAR menu is gated on a buyer session, so it renders for neither
//     guests nor vendors-without-a-buyer-cookie — and guests watching five
//     credits drain are exactly who this is for. A gauge you must open a
//     drawer to read is not a gauge.
//   - A FLOATING badge collides with this very row, which is why CreditsFab
//     is desktop-only.
//
// `lg:hidden`, mirroring CreditsFab's `hidden lg:flex`: from `lg` up the
// floating ring has the corner to itself and this would be a second copy of
// one number.
//
// Rendered only in the composer's NORMAL branch, so it is absent during the
// phone/OTP capture and clarification modes that replace that row. Correct
// rather than incidental: none of those steps spend credits, and a balance is
// noise while someone is typing a verification code.

export function CreditsBar() {
  const { balance, used } = useCredits();
  const { open } = useCreditsModal();

  if (balance === null) return null;

  const spent = Math.max(used, 0);
  const total = Math.max(balance, 0) + spent;
  const pct = total > 0 ? Math.min((spent / total) * 100, 100) : 0;

  return (
    <button
      type="button"
      onClick={open}
      title={`${spent} of ${total} Velte credits used`}
      aria-label={`${spent} of ${total} credits used. Open credits.`}
      // `min-w-0 flex-1` claims the middle of the row; `justify-center` then
      // centres the meter within it, which matters now the bar is a fixed
      // width rather than something that stretches to both buttons.
      className="mx-3 flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 lg:hidden"
    >
      {/* Muted, and smaller than anything else in the composer. The bar is
          the part meant to be read at a glance; these are for when someone
          actually looks, and they must not compete with the placeholder or
          the send button for the eye. */}
      <span className="shrink-0 text-[11px] font-semibold tabular-nums text-gray-500">
        {spent}
      </span>

      {/* Same white-body-and-border construction as the floating ring, so the
          two are recognisably one object in two shapes — see lib/creditMeter
          for why the unfilled state is neutral here rather than a second
          orange. */}
      <span
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={spent}
        aria-label="Credits used"
        // 96px, not the full row. Stretching to both buttons made a
        // five-credit guest allowance and a two-hundred-credit vendor one
        // look identically long, which turned a gauge into a decorative rule
        // across the composer.
        //
        // Deliberately NOT `shrink-0`, unlike the two numbers either side:
        // this is the one part that can afford to give, so at 320px — where
        // 96px plus the labels is about 20px more than the row has — the bar
        // gives those pixels back instead of pushing the send button.
        className="h-2 w-24 overflow-hidden rounded-full border bg-white"
        style={{ borderColor: METER_EMPTY }}
      >
        <span
          className="block h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%`, backgroundColor: METER_FILL }}
        />
      </span>

      {/* The unit, spelled out once. Nothing else in the composer says what
          these two numbers are, and "3 … 20" beside a camera and a send
          button could be almost anything. Lighter than the figure itself —
          the number is the fact, the word is only its unit. */}
      <span className="shrink-0 text-[11px] font-semibold whitespace-nowrap text-gray-400">
        <span className="tabular-nums">{total}</span>
        <span className="ml-1 font-normal">credits</span>
      </span>
    </button>
  );
}
