import { CHANNEL_PHRASE } from "@/lib/priceChannels";
import { fmt } from "@/lib/product-price";
import type {
  NegotiationBrief,
  PriceBand,
  PriceBandChannel,
} from "@/types/search";

// What to actually offer — the negotiation brief (2026-08-31).
//
// The band tells a buyer what a thing costs. It does not tell them what to
// SAY, and in a market where the asking price is an opening bid and what you
// end up paying depends on whether the trader reads you as knowing the
// market, that gap is most of the value. A buyer who knows the range and
// still opens at the asking price has learned nothing they can spend.
//
// NO MODEL CALL — same rule as priceBand.ts, and here it is stronger rather
// than weaker. Every number below is arithmetic over a band that already
// exists, and every sentence is a fixed template. Advice about how to spend
// somebody's money should not be re-improvised on each render: a model asked
// to "phrase the brief" would occasionally invent a justification, and the
// one thing this block cannot afford is a confident reason that isn't true.
//
// WHY IT IS METERED AT ALL, given it costs nothing to produce: because it is
// what Velte Plus is sold on. See plans.ts's note on MeteredKind — a flat
// naira price against dollar costs can only ever be carried by things that
// are cheap to serve and genuinely valuable, and this and price watches are
// the two of those Velte has.

const naira = (kobo: number) => fmt(kobo / 100, "₦");

/** How far under the target to open.
 *
 *  Twelve percent, and the number is a judgement about people rather than
 *  about prices. Open at the target and there is nowhere to be moved to, so
 *  the buyer pays the target at best. Open at half and a Nigerian trader
 *  reads it as not a serious customer and stops engaging — the failure mode
 *  that makes haggling advice worse than none. Just under a tenth is the
 *  range where the counter-offer lands near the target. */
const OPENING_DISCOUNT = 0.12;

/** Round to a figure somebody would actually say out loud.
 *
 *  "Offer him ₦93,720" is not advice, it is a spreadsheet. Prices are spoken
 *  in round numbers and an un-round one announces that it came off a screen,
 *  which is the opposite of sounding like you know the market.
 *
 *  Always rounds DOWN, so every figure lands on the buyer's side of the line:
 *  a slightly lower opening costs nothing, and a walk-away point rounded down
 *  errs toward not overpaying. */
function sayable(kobo: number): number {
  const value = kobo / 100;
  const step =
    value >= 100_000
      ? 5_000
      : value >= 20_000
        ? 1_000
        : value >= 5_000
          ? 500
          : 100;
  return Math.floor(value / step) * step * 100;
}

/**
 * The brief for a band, or null when the band cannot support one.
 *
 * Null rather than a hedged brief, deliberately. Every other rung of this
 * feature degrades gracefully — a thin band still shows its listings — but
 * there is no honest weak version of "offer him this much". A number to say
 * in a shop is either backed by a real range or it should not be said.
 */
export function buildNegotiationBrief(
  band: PriceBand,
): NegotiationBrief | null {
  // The same market the verdict measures against, and it must be the same
  // one: a buyer told "that's above the market" and then handed an opening
  // offer computed off a DIFFERENT market has been given two answers to one
  // question. Cheapest-with-a-range, for the reason priceBand.ts gives.
  const ranged = band.channels.filter((c) => c.ranged);
  if (ranged.length === 0) return null;
  const channel: PriceBandChannel = [...ranged].sort(
    (a, b) => a.midKobo - b.midKobo,
  )[0];

  // The quarter of this market that sells cheapest genuinely exists — a
  // buyer who reaches it has done well, and it is reachable, which is what
  // separates a target from a wish.
  let targetKobo = sayable(channel.lowKobo);
  let openKobo = sayable(channel.lowKobo * (1 - OPENING_DISCOUNT));
  const walkKobo = sayable(channel.highKobo);

  // Rounding three numbers independently can collapse them into each other
  // on a narrow band — at which point the advice would be "open at ₦50,000,
  // aim for ₦50,000". Fall back to the unrounded figures rather than emit a
  // brief that says nothing.
  if (openKobo >= targetKobo) {
    openKobo = Math.round(channel.lowKobo * (1 - OPENING_DISCOUNT));
    targetKobo = channel.lowKobo;
  }
  if (openKobo <= 0 || targetKobo <= 0 || walkKobo <= targetKobo) return null;

  const where = CHANNEL_PHRASE[channel.id];
  const points: string[] = [];

  // 1. The evidence, first and always. It is what turns the numbers below
  //    from an opinion into something the buyer can repeat out loud.
  //
  //    Counted on the CHANNEL, never on the band. `band.totalCount` spans
  //    every market, so attributing it here ("shops near you are asking X,
  //    across 6 listings") credits one market with listings that came from
  //    another — a false claim, and precisely the sort this feature exists to
  //    protect people from. Caught by running the numbers through it.
  points.push(
    `${where.charAt(0).toUpperCase()}${where.slice(1)} are asking ${naira(
      channel.lowKobo,
    )}–${naira(channel.highKobo)}, across ${channel.count} listing${
      channel.count === 1 ? "" : "s"
    }.`,
  );

  // 2. The gap, when this is the cheap market — the single strongest thing a
  //    buyer can hold, because it is the one that makes walking away real
  //    rather than a bluff.
  if (band.gapKobo != null && band.cheapestChannel === channel.id) {
    points.push(
      `Elsewhere the same thing runs about ${naira(
        band.gapKobo,
      )} more, so you have somewhere else to go — that is what makes a walk-away believable.`,
    );
  }

  // 3. The trap. A quote far under the band is usually condition, not
  //    generosity, and this is where a buyer gets hurt worst — they think
  //    they won.
  if (band.usedCount > 0) {
    points.push(
      `${band.usedCount} used or refurbished listing${
        band.usedCount === 1 ? " was" : "s were"
      } left out of these numbers. If someone goes far below ${naira(
        // The MARKET's floor, not our own opening offer. A price under what
        // we told the buyer to open at is not suspicious — that is them
        // winning. What is suspicious is a price under what this market does
        // at all, and that is a different number.
        channel.lowKobo,
      )}, ask what condition it is in before anything else.`,
    );
  }

  // 4. The hedge, last, and only when the data earns it. A brief that hedges
  //    up front is one nobody acts on.
  if (band.confidence === "rough") {
    points.push(
      `Prices for this vary a lot, so treat these as a guide rather than a rule.`,
    );
  }

  return {
    query: band.query,
    channel: channel.id,
    openKobo,
    targetKobo,
    walkKobo,
    points,
    // Written as something a buyer can say verbatim, and every word of it has
    // to be TRUE — this is the one place Velte puts a sentence in a real
    // person's mouth to say to a real trader.
    //
    // Which is why the figure quoted is the market's own floor and the figure
    // ASKED FOR is the opening offer. The first draft said "I've seen this
    // going for ₦150,000" using the opening number, which we have not seen it
    // going for and nobody is selling it at — it would have coached the buyer
    // into a lie, and one a trader who knows their own market would catch
    // immediately. Stating what was actually observed and then asking for
    // less is both honest and the stronger position.
    openingLine: `I've been checking prices — ${naira(
      channel.lowKobo,
    )} is about the lowest I'm seeing. Can you do ${naira(openKobo)}?`,
  };
}
