import type { BuyerRequestResponder } from "@/types/buyerRequest";

// Comparing the quotes on a Buyer Request (2026-09-03).
//
// DETERMINISTIC. No model call, anywhere in this file — the same split
// priceBand.ts and negotiationBrief.ts already run on, and for the same
// reason: **the model translates, code decides everything checkable.** Which
// of three prices is lowest is not a judgement, and a recommendation a model
// produced could not be explained to the buyer in terms they could check.
//
// Client-safe, and it has to be: the comparison renders in the browser and
// there is nothing secret in arithmetic over numbers the buyer can already
// see on the page.
//
// ── The rule this file is built around ──────────────────────────────────
//
// EVERY VERDICT MUST BE EXPLAINABLE IN ONE SENTENCE THE BUYER CAN CHECK.
// "Best overall" with no stated reason is a black box asking to be trusted,
// and Velte's whole position is that it shows its working. So every result
// below carries the sentence that justifies it, built from the same numbers
// the buyer is looking at — if the sentence can't be written, the verdict
// isn't returned.
//
// What this is NOT: a quality ranking. Velte cannot know which vendor is
// better, only which quote is cheaper or faster. Trust score, distance and
// reputation are deliberately absent — mixing an objective number with a
// subjective one produces a recommendation nobody can argue with, which is
// the opposite of useful when someone is about to spend real money.

/** A responder who actually named a price. The comparison only ever ranks
 *  these; everyone else is listed separately rather than sorted to the
 *  bottom, because "didn't quote" is not a worse offer than one that was
 *  made — it is the absence of an offer. */
export interface QuotedResponder extends BuyerRequestResponder {
  priceKobo: number;
}

export interface QuoteComparison {
  /** Priced quotes, cheapest first. */
  quoted: QuotedResponder[];
  /** Accepted, but named no price. Shown under the table with a prompt to
   *  ask — they may well be the best option, we just can't say so. */
  unquoted: BuyerRequestResponder[];
  /** The lowest price. Null when nobody quoted. */
  cheapest: QuotedResponder | null;
  /** The shortest lead time among quotes that stated one, and only when it
   *  is someone OTHER than the cheapest — otherwise there is no trade-off to
   *  point out and a second badge is just noise. */
  fastest: QuotedResponder | null;
  /** What we actually suggest, with the sentence that justifies it. Null
   *  when there is nothing worth suggesting (nobody quoted, or only one did
   *  — a single quote is a price, not a choice). */
  recommendation: { responder: QuotedResponder; reason: string } | null;
  /** The gap between cheapest and dearest, in kobo. Null unless at least two
   *  quoted. This is the number that tells a buyer whether comparing was
   *  worth it at all. */
  spreadKobo: number | null;
}

/** How much dearer a quote may be and still win on speed. Ten percent: below
 *  that the price difference on a typical Nigerian retail purchase is small
 *  enough that a materially earlier delivery is worth more, and above it the
 *  buyer should be the one making that call, not us. */
const SPEED_PREMIUM_RATIO = 1.1;

/** How much sooner it has to arrive to justify that premium. Two days —
 *  under that, "faster" is within the noise of what either vendor will
 *  actually manage, and recommending on it would be false precision. */
const MEANINGFUL_DAYS_SAVED = 2;

const naira = (kobo: number) =>
  `₦${Math.round(kobo / 100).toLocaleString("en-NG")}`;

function hasPrice(r: BuyerRequestResponder): r is QuotedResponder {
  return typeof r.priceKobo === "number" && r.priceKobo > 0;
}

/**
 * Turns a request's responders into a comparison, or into the honest
 * admission that there isn't one to draw.
 *
 * Never throws and never invents: every field is derived from a price or a
 * lead time a vendor actually stated.
 */
export function compareQuotes(
  responders: BuyerRequestResponder[],
): QuoteComparison {
  const quoted = responders
    .filter(hasPrice)
    .sort((a, b) => a.priceKobo - b.priceKobo);
  const unquoted = responders.filter((r) => !hasPrice(r));

  const empty: QuoteComparison = {
    quoted,
    unquoted,
    cheapest: null,
    fastest: null,
    recommendation: null,
    spreadKobo: null,
  };

  if (!quoted.length) return empty;

  const cheapest = quoted[0];

  // One quote is a price, not a comparison. Returning a "recommendation"
  // here would dress the only available option up as a considered choice.
  if (quoted.length === 1) {
    return { ...empty, cheapest };
  }

  const dearest = quoted[quoted.length - 1];
  const spreadKobo = dearest.priceKobo - cheapest.priceKobo;

  // The fastest quote that stated a lead time at all. Only surfaced when it
  // isn't already the cheapest — if one vendor is both, there is no
  // trade-off and a second badge on the same row says nothing.
  const withLead = quoted.filter((q) => q.leadTimeDays != null);
  const fastestCandidate = withLead.length
    ? withLead.reduce((best, q) =>
        (q.leadTimeDays as number) < (best.leadTimeDays as number) ? q : best,
      )
    : null;
  const fastest =
    fastestCandidate && fastestCandidate.vendorId !== cheapest.vendorId
      ? fastestCandidate
      : null;

  // ── The recommendation ────────────────────────────────────────────────
  //
  // Default to the cheapest, because that is the one claim we can make
  // without knowing anything about the buyer. Override it only when another
  // quote is BOTH barely dearer AND meaningfully sooner — the one trade-off
  // where "cheapest" is reliably the wrong advice.
  let recommendation: QuoteComparison["recommendation"] = {
    responder: cheapest,
    reason: `Lowest price — ${naira(spreadKobo)} less than the highest quote.`,
  };

  if (
    fastest &&
    cheapest.leadTimeDays != null &&
    fastest.leadTimeDays != null &&
    fastest.priceKobo <= cheapest.priceKobo * SPEED_PREMIUM_RATIO &&
    cheapest.leadTimeDays - fastest.leadTimeDays >= MEANINGFUL_DAYS_SAVED
  ) {
    const extra = fastest.priceKobo - cheapest.priceKobo;
    const daysSaved = cheapest.leadTimeDays - fastest.leadTimeDays;
    recommendation = {
      responder: fastest,
      reason: `${naira(extra)} more than the cheapest, but ${daysSaved} days sooner.`,
    };
  }

  return { quoted, unquoted, cheapest, fastest, recommendation, spreadKobo };
}

/** "in 3 days" / "available now" / null when they didn't say. Shared so the
 *  table and any summary line phrase a lead time identically. */
export function leadTimeLabel(days: number | null): string | null {
  if (days == null) return null;
  if (days === 0) return "Available now";
  return days === 1 ? "In 1 day" : `In ${days} days`;
}
