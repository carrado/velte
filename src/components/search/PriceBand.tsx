"use client";

import { useEffect, useState } from "react";

import { fmt } from "@/lib/product-price";
import { CREDIT_COST } from "@/lib/credits";
import { spendGuestCredits } from "@/lib/guestCredits";
import { CHANNEL_LABEL, CHANNEL_PHRASE } from "@/lib/priceChannels";
import { useBuyerStore } from "@/store/buyerStore";
import { useUserStore } from "@/store/userStore";
import type {
  PriceBand as PriceBandData,
  PriceVerdict as PriceVerdictData,
} from "@/types/search";

// The fair-price block — "what should this actually cost?" (2026-08-30).
//
// Container-less and unboxed, the same as RecommendationPicks and WatchOffer:
// this is Velte still talking, and every one of its messages reads as plain
// text in the thread. A panel here would make the most useful thing on the
// page look like an advert dropped into the conversation.
//
// Deliberately NOT interactive. Nothing to click, nothing to expand. The
// buyer reads three numbers and knows where they stand — adding a control
// would turn an answer into a task.
//
// Still true as of 2026-08-31, when the negotiation brief arrived. That block
// DOES have a control, which is exactly why it lives in its own component
// below this one rather than as a button in here: the band is the answer, the
// brief is something you choose to do about the answer, and it spends a
// metered allowance. See NegotiationBrief.tsx.

const naira = (kobo: number) => fmt(kobo / 100, "₦");

/** A stable identity for one band, so a guest is charged for it ONCE.
 *
 *  Derived from the band's own content rather than from a turn id, and that is
 *  the point: the guest's allowance is counted when this block renders, and
 *  this block re-renders constantly — React re-renders it, a refresh
 *  rehydrates the thread and mounts it again, StrictMode double-invokes the
 *  effect in dev. A turn id would fix none of those, because rehydrated turns
 *  are rebuilt client-side and get fresh ids; the CONTENT is what survives a
 *  reload, so the content is what identifies it.
 *
 *  The prices are in it, not just the query, so that asking the same question
 *  again next week — when the market has moved — is honestly a new answer.
 *  Asking twice in one sitting and getting an identical band is not. */
function bandToken(band: PriceBandData): string {
  const shape = band.channels
    .map((c) => `${c.id}:${c.midKobo}:${c.count}`)
    .join("|");
  return `${band.query}#${band.confidence}#${band.totalCount}#${shape}`;
}

export function PriceBand({ band }: { band: PriceBandData }) {
  // Either kind of account counts as signed in, and for the same reason
  // WatchesPage checks both: a vendor browsing /chat is on a different
  // cookie and a different store, and is metered server-side on their own
  // row. Reading only the buyer store would show a signed-in vendor the
  // "sign in to see it" nudge — the exact bug the dual-cookie work fixed
  // everywhere else.
  const buyer = useBuyerStore((s) => s.buyer);
  const vendor = useUserStore((s) => s.user);
  const signedIn = Boolean(buyer || vendor);

  // Resolved once on mount rather than read during render: the count must
  // not change under a re-render, and reading localStorage during SSR would
  // be a hydration mismatch.
  const [guestBlocked, setGuestBlocked] = useState<boolean | null>(null);

  // Pure, so it is safe during render — and it is the effect's dependency
  // rather than `band` itself, which is an object whose identity can change
  // without its contents changing.
  const token = bandToken(band);

  /* eslint-disable react-hooks/set-state-in-effect --
     An effect is the correct place for this, and the two obvious
     alternatives are both wrong here:

       - a lazy useState initialiser would read localStorage during render,
         which is impure, and StrictMode double-invokes initialisers in dev —
         so a guest's single allowance would be spent twice before they saw
         anything.
       - reading during render without useState reintroduces the hydration
         mismatch this state exists to avoid.

     Counting a consumption IS a side effect, so it belongs after commit. */
  useEffect(() => {
    if (signedIn) {
      setGuestBlocked(false);
      return;
    }
    // A guest pays for the band from their browser-side balance — the server
    // has no row to charge them against, so the client does it.
    //
    // Idempotent on the band's own CONTENT, via `token`: this runs on every
    // mount, and a thread rehydrated after a refresh mounts every band in it
    // again. Charging per mount would bill a guest repeatedly for one answer
    // they had already paid for. Content rather than a turn id, because
    // rehydrated turns are rebuilt client-side with fresh ids and only the
    // content survives a reload.
    setGuestBlocked(!spendGuestCredits(CREDIT_COST.band, token));
  }, [signedIn, token]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Undecided on the first paint — render nothing rather than flash a block
  // that is about to be withdrawn.
  if (guestBlocked === null) return null;

  if (guestBlocked) {
    return (
      <div className="mt-3 space-y-1.5">
        <p className="text-sm text-gray-500">
          I worked out what this should cost — sign in to see it.
        </p>
        <p className="text-xs text-gray-500">
          Create a free account for 15 credits — enough to check what several
          things should cost before you pay for any of them.
        </p>
      </div>
    );
  }

  return <PriceBandBlock band={band} />;
}

function PriceBandBlock({ band }: { band: PriceBandData }) {
  // Too little to claim a market — show the actual prices instead. Two real
  // listings with the shop named is worth far more to a buyer than silence,
  // and it is honest about being two listings.
  if (band.confidence === "listings") {
    return (
      <div className="mt-3 space-y-2">
        <p className="text-sm text-gray-500">
          {band.totalCount === 1
            ? "Only one price I could find for this:"
            : `Only ${band.totalCount} prices I could find for this:`}
        </p>
        <ul className="space-y-1.5">
          {band.listings.map((listing, i) => (
            <li
              key={`${listing.url ?? listing.label}-${i}`}
              className="flex items-baseline justify-between gap-3"
            >
              <span className="min-w-0 truncate text-sm text-[#023337]">
                {listing.merchant ?? CHANNEL_LABEL[listing.channel]}
              </span>
              <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-[#023337]">
                {naira(listing.priceKobo)}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-gray-500">
          Not enough to say what&apos;s normal yet. What were you quoted?
          I&apos;ll tell you if it sounds right.
        </p>
      </div>
    );
  }

  // Cheapest market first — the buyer's eye should land on the number that
  // saves them money, not on whichever channel happened to sort first.
  const channels = [...band.channels].sort((a, b) => a.midKobo - b.midKobo);
  const cheapest = band.cheapestChannel
    ? CHANNEL_LABEL[band.cheapestChannel].toLowerCase()
    : null;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-sm text-gray-500">
        {band.confidence === "rough"
          ? "Roughly what this goes for — treat it as a guide:"
          : "What this actually goes for:"}
      </p>

      <ul className="space-y-1">
        {channels.map((channel) => (
          <li
            key={channel.id}
            className={
              // The cheapest market is the finding, so it is the one row
              // that carries any weight. Everything else stays quiet.
              channel.id === band.cheapestChannel
                ? "flex items-baseline justify-between gap-3 rounded-lg bg-orange-50 px-2.5 py-1.5"
                : "flex items-baseline justify-between gap-3 px-2.5 py-1.5"
            }
          >
            <span className="min-w-0 truncate text-sm text-gray-600">
              {CHANNEL_LABEL[channel.id]}
            </span>
            <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-[#023337]">
              {channel.ranged
                ? `${naira(channel.lowKobo)} – ${naira(channel.highKobo)}`
                : naira(channel.midKobo)}
            </span>
          </li>
        ))}
      </ul>

      {/* The gap is the real answer — "where should I buy this, and what does
          that choice cost me?" beats any single price, and nobody else tells
          a Nigerian buyer this. */}
      {band.gapKobo != null && cheapest && (
        <p className="px-2.5 text-sm font-semibold text-[#023337]">
          Buying from {cheapest} saves you about {naira(band.gapKobo)}.
        </p>
      )}

      {/* The buyer named a price, so answer the question they actually asked.
          Above the footnote and below the numbers: it is the most important
          line in the block whenever it exists, but it only means anything
          once the ranges above have been read. */}
      {band.verdict && <Verdict verdict={band.verdict} />}

      {/* Always present. This is what makes the block a measurement rather
          than an oracle — and what stops a buyer over-trusting it when we
          are thin on data. */}
      <p className="px-2.5 text-xs text-gray-500">
        Based on {band.totalCount} listing{band.totalCount === 1 ? "" : "s"}.
        {band.usedCount > 0 && (
          <>
            {" "}
            {band.usedCount} used/refurbished listing
            {band.usedCount === 1 ? "" : "s"} left out — a much cheaper quote is
            usually one of those, so check before you pay.
          </>
        )}
      </p>
    </div>
  );
}

/** "Should I buy this?" — where the buyer's own quoted price lands.
 *
 *  Deliberately says the NUMBER back to them before judging it. A verdict on
 *  a price they can't see restated is one they have to take on faith, and the
 *  whole point of this block is that every claim in it is checkable.
 *
 *  No red. `overpriced` is the strongest thing said here and it is said in
 *  words, not colour — a red badge over a real trader's real quote reads as an
 *  accusation of dishonesty, when the honest claim is narrower: this is above
 *  what this market charges, and here is the range it was measured against.
 *  That is also the claim we can actually defend. */
function Verdict({ verdict }: { verdict: PriceVerdictData }) {
  const where = CHANNEL_PHRASE[verdict.against];
  const quoted = naira(verdict.quotedKobo);
  const gap = naira(Math.abs(verdict.deltaKobo));

  const line =
    verdict.status === "good"
      ? `${quoted} is a good price — that's at the cheap end of what ${where} are charging.`
      : verdict.status === "fair"
        ? `${quoted} is a fair price. It sits inside what ${where} normally charge.`
        : verdict.status === "high"
          ? `${quoted} is on the high side — about ${gap} above the middle for ${where}. Worth pushing back.`
          : `${quoted} is well above the market. ${where.charAt(0).toUpperCase()}${where.slice(
              1,
            )} are charging about ${gap} less. Check it's the same thing before you pay.`;

  return <p className="px-2.5 text-sm font-semibold text-[#023337]">{line}</p>;
}
