// The two colours every credit meter is drawn in (2026-09-01).
//
// One file because there is more than one meter — the floating ring
// (credits/CreditsFab) and the panel ring (credits/CreditsDonut) — showing the
// same fact in two places. They had the same hex values pasted into each, with
// a comment in each saying "matching the other exactly", which is precisely
// the second copy this codebase keeps taking out. (A header bar was a third
// until 2026-09-01; the constants outlived it, which is rather the point.)
//
// Both checked with the palette validator rather than eyeballed:
//
//   FILL  #ea580c  clears 3:1 against white. The brand's usual orange-500
//                  (#f97316) misses it at 2.8:1, which is why the meter runs
//                  a step deeper than buttons elsewhere.
//   TRACK #fdba74  1.69:1 — recessive, as a rail should be, but no longer
//                  invisible. It was orange-200 (#fed7aa) until an empty
//                  meter turned out to be all track and nothing else: at 0%
//                  used there is no fill at all, so the track IS the bar, and
//                  orange-200 on the old orange-50 pill was the same value as
//                  that pill's own border. It read as a stray hairline.
//
// TRACK is deliberately not any brighter. orange-400 (#fb923c) is easier to
// see at 2.26:1 but sits only ΔE 10.8 from the fill under deuteranopia, which
// starts to blur the one boundary the whole mark exists to show. #fdba74 keeps
// ΔE 18.5.
//
// TWO unfilled colours, and the split is by what the meter IS, not by taste.
// Drawn ONTO the page (the panel's ring, on its own card) the unfilled part is
// a lighter step of the same hue — that is what makes state read across the
// whole mark rather than only the filled part. Drawn as an OBJECT in front of
// the page (the floating ring, the header bar — each with a white body and a
// border) it is neutral, because those read as "how much of this shape is
// orange" and a warm unfilled state blurs the single edge doing the work.

/** Spent. The mark that moves. */
export const METER_FILL = "#ea580c";

/** Everything not yet spent.
 *
 *  Neutral rather than a lighter step of the same hue, which is the usual
 *  rule for a meter and was what this used (orange-300) while the panel's
 *  ring still filled with what REMAINED. Once every meter fills with what has
 *  been SPENT, a warm unfilled state says the wrong thing: an untouched
 *  account would show a full pale-orange ring, which reads as full rather
 *  than as nothing-spent-yet. Grey empties to grey and fills to orange, which
 *  is the story.
 *
 *  gray-200, the same value the floating ring and the composer bar use for
 *  their borders, so an empty meter is one clean shape rather than a ring
 *  inside a ring. */
export const METER_EMPTY = "#e5e7eb";
