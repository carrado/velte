import { useState } from "react";
import { fmt } from "@/lib/product-price";
import type {
  ExternalOffer,
  SearchRecommendation,
  VendorMatch,
} from "@/types/search";

// The actual, factual differences between two listings — computed here in
// the browser from the two products' own fields, never written by the
// model. That's the whole point of the "Show me the difference" toggle: the
// model names the catch in one sentence (already server-verified as real),
// and the buyer can then expand a plain side-by-side that has no room to
// fabricate anything. Nothing here can say more than the data does.
function buildDifferenceRows(
  tradeoff: VendorMatch,
  topPick: VendorMatch,
): { label: string; tradeoff: string; topPick: string }[] {
  const rows: { label: string; tradeoff: string; topPick: string }[] = [];
  const priceOf = (m: VendorMatch) =>
    m.quoteOnRequest
      ? "Ask for price"
      : fmt(m.price, m.currency === "USD" ? "$" : "₦");

  if (tradeoff.name.trim() !== topPick.name.trim()) {
    rows.push({
      label: "Listing",
      tradeoff: tradeoff.name,
      topPick: topPick.name,
    });
  }
  if (
    tradeoff.price !== topPick.price ||
    tradeoff.quoteOnRequest !== topPick.quoteOnRequest
  ) {
    rows.push({
      label: "Price",
      tradeoff: priceOf(tradeoff),
      topPick: priceOf(topPick),
    });
  }
  if (tradeoff.distanceKm !== topPick.distanceKm) {
    rows.push({
      label: "Distance",
      tradeoff:
        tradeoff.distanceKm != null ? `${tradeoff.distanceKm}km` : "Unknown",
      topPick:
        topPick.distanceKm != null ? `${topPick.distanceKm}km` : "Unknown",
    });
  }
  // Vendor-entered detail fields, compared by name so "Edition: Digital"
  // vs "Edition: Disc" lines up as one row. A field only one of them has
  // is still worth showing — that absence is itself the difference.
  const names = new Set([
    ...tradeoff.attributes.map((a) => a.name),
    ...topPick.attributes.map((a) => a.name),
  ]);
  for (const name of names) {
    const left = tradeoff.attributes.find((a) => a.name === name)?.value;
    const right = topPick.attributes.find((a) => a.name === name)?.value;
    if ((left ?? "") === (right ?? "")) continue;
    rows.push({
      label: name,
      tradeoff: left ?? "Not stated",
      topPick: right ?? "Not stated",
    });
  }
  const photos = (m: VendorMatch) =>
    (m.mainImageUrl ? 1 : 0) + m.thumbnailUrls.length;
  if (photos(tradeoff) !== photos(topPick)) {
    rows.push({
      label: "Photos",
      tradeoff: `${photos(tradeoff)}`,
      topPick: `${photos(topPick)}`,
    });
  }
  return rows;
}

// The external analogue of buildDifferenceRows. Same principle as the Velte
// version: the model's sentence names the catch, this lets the buyer check
// it against the data.
//
// Was three rows — title, price, shop — back when that was genuinely all an
// off-Velte offer carried. Since 2026-08-27 these also carry the listing's
// full photo set, and the photo count earns a row for the same reason it
// does on the Velte side: the tradeoff note can now say "the third photo
// shows a cracked screen", and a buyer who reads that should be able to see
// at a glance that there WERE three photos to look at.
function buildOfferDifferenceRows(
  tradeoff: ExternalOffer,
  topPick: ExternalOffer,
): { label: string; tradeoff: string; topPick: string }[] {
  const rows: { label: string; tradeoff: string; topPick: string }[] = [];
  if (tradeoff.title.trim() !== topPick.title.trim()) {
    rows.push({
      label: "Listing",
      tradeoff: tradeoff.title,
      topPick: topPick.title,
    });
  }
  if (tradeoff.priceText !== topPick.priceText) {
    rows.push({
      label: "Price",
      tradeoff: tradeoff.priceText ?? "Not shown",
      topPick: topPick.priceText ?? "Not shown",
    });
  }
  if (tradeoff.merchant !== topPick.merchant) {
    rows.push({
      label: "Shop",
      tradeoff: tradeoff.merchant ?? "Unknown",
      topPick: topPick.merchant ?? "Unknown",
    });
  }
  const photos = (o: ExternalOffer) =>
    (o.imageUrl ? 1 : 0) + o.galleryUrls.length;
  if (photos(tradeoff) !== photos(topPick)) {
    rows.push({
      label: "Photos",
      tradeoff: `${photos(tradeoff)}`,
      topPick: `${photos(topPick)}`,
    });
  }
  return rows;
}

// One row's worth of resolved candidate, whichever kind it came from. The
// picks block only ever needs a name and (for the Nearest row) a distance,
// so both sources collapse to this and the render below stops caring which
// it is. A turn is only ever one or the other in practice — external offers
// exist solely on turns where Velte found nothing — but nothing here
// depends on that.
interface PickItem {
  id: string;
  name: string;
  distanceKm: number | null;
}

// The chip labels one product card earns from a turn's recommendation —
// the WHICH half, worn on the card itself (VendorResultCard's pickBadges
// prop). A product can genuinely earn more than one ("Top pick" that's
// also "Nearest"); undefined keeps the card prop-free on turns with no
// recommendation at all.
export function pickBadgesFor(
  productId: string,
  recommendation: SearchRecommendation | null,
  // "Best value" is a judgment the model makes over Velte listings, where
  // it weighs price against what the seller actually offers. Over external
  // offers the same field holds a code-computed CHEAPEST (see
  // pickExternalRecommendation), and calling that "Best value" would claim
  // more than the arithmetic supports.
  valueLabel: string = "Best value",
): string[] | undefined {
  if (!recommendation) return undefined;
  const badges: string[] = [];
  if (recommendation.bestOverallId === productId) badges.push("Top pick");
  if (recommendation.bestValueId === productId) badges.push(valueLabel);
  if (recommendation.nearestId === productId) badges.push("Nearest");
  return badges.length ? badges : undefined;
}

// The "explain WHY" half of the recommendation layer (Phase 3,
// docs/velte-ai-search-flow-plan.md) — a compact summary block rendered
// above the product carousel whenever a turn carries a
// SearchRecommendation. The badge chips on the cards themselves say WHICH;
// this says WHY, in the model's own one-liners (already sanitized and
// length-capped server-side — see recommendResults.ts). Rows resolve their
// product by id against the REAL result list and silently skip anything
// that doesn't resolve — this block must never be a reason a turn looks
// broken.
//
// 2026-08-25 redesign per explicit request (twice-refined): no icons, no
// "Velte's Picks" label, and no container of its own — no background, no
// border, no dividers. It renders as a continuation of the conversation:
// the lead-in is the MODEL'S OWN sentence for this turn
// (SearchRecommendation.leadIn — written fresh each time so it varies like
// real conversation, falling back to a small local pool when null), styled
// exactly like reply prose, and the PRODUCT NAME carries each row
// (semibold, brand ink) with the chip beside it and the reason underneath
// as quieter supporting text.

// Fallback lead-ins for a recommendation whose model-written one was
// missing or sanitized away. Picked by a stable hash of the turn's own ids
// — NOT Math.random — so the same turn shows the same sentence across
// re-renders and refresh rehydrates instead of flickering between
// phrasings.
const FALLBACK_LEAD_INS = [
  "Here's how I'd choose between these:",
  "Between these, here's where I'd lean:",
  "A quick take before you scroll through:",
  "If it helps, here's my honest read on these:",
  "Comparing them side by side, this is how they stack up:",
];

function fallbackLeadIn(recommendation: SearchRecommendation): string {
  const seedSource =
    (recommendation.bestOverallId ?? "") +
    (recommendation.bestValueId ?? "") +
    (recommendation.nearestId ?? "");
  let seed = 0;
  for (let i = 0; i < seedSource.length; i++) {
    seed = (seed + seedSource.charCodeAt(i)) % FALLBACK_LEAD_INS.length;
  }
  return FALLBACK_LEAD_INS[seed];
}
// Scrolls the card this row is talking about into view, and flashes it so
// the eye lands on the right one (2026-08-29, per explicit request: the
// picks should be clickable and move to the respective card).
//
// Scoped by walking UP from the clicked row to its own results group rather
// than querying the document: the same product can legitimately appear in
// two different turns of one conversation, and a bare document query would
// scroll to whichever rendered first — usually the older turn, off-screen
// above. `data-results-group` marks the wrapper that holds this block and
// its carousel together.
//
// `block: "nearest"` keeps the page from jumping vertically when the card is
// already in view — the horizontal move is the point; a vertical one would
// feel like the thread lost its place.
function scrollToCard(from: HTMLElement, id: string) {
  const group = from.closest("[data-results-group]");
  if (!group) return;
  // CSS.escape because a product id is arbitrary data in a selector.
  // Guarded: older Safari and some in-app WebViews lack it, and a missing
  // scroll is a far better outcome than a thrown error mid-conversation.
  const selector =
    typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? `[data-slide-id="${CSS.escape(id)}"]`
      : null;
  if (!selector) return;
  const slide = group.querySelector<HTMLElement>(selector);
  if (!slide) return;

  slide.scrollIntoView({
    behavior: "smooth",
    inline: "center",
    block: "nearest",
  });

  // A brief ring rather than a persistent selected state: this is a "look
  // here" gesture, not a selection the buyer has to undo. Applied to the
  // slide so it frames the whole card without touching the card component.
  slide.classList.add("velte-pick-flash");
  window.setTimeout(() => slide.classList.remove("velte-pick-flash"), 1600);
}

export function RecommendationPicks({
  recommendation,
  products,
  offers = [],
  valueLabel = "Best value",
}: {
  recommendation: SearchRecommendation;
  products: VendorMatch[];
  // See pickBadgesFor — the chip and this block's row must agree.
  valueLabel?: string;
  // Off-Velte offers from a dead-end turn (2026-08-26) — the same picks
  // block, over the only candidates that turn has. Empty on every ordinary
  // turn, which leaves the behaviour below byte-for-byte what it was.
  offers?: ExternalOffer[];
}) {
  const byId = new Map<string, PickItem>([
    ...products.map(
      (p) =>
        [
          p.productId,
          { id: p.productId, name: p.name, distanceKm: p.distanceKm },
        ] as const,
    ),
    // An online listing has no distance to anything, hence null — which is
    // also why pickExternalRecommendation never returns a nearestId.
    ...offers.map(
      (o) => [o.id, { id: o.id, name: o.title, distanceKm: null }] as const,
    ),
  ]);

  const rows: {
    label: string;
    name: string;
    reason: string | null;
    // The card this row points at. Every row has one — the row only exists
    // because its candidate resolved — so the whole block is clickable.
    id: string;
  }[] = [];

  const bestOverall = recommendation.bestOverallId
    ? byId.get(recommendation.bestOverallId)
    : undefined;
  if (bestOverall) {
    rows.push({
      label: "Top pick",
      name: bestOverall.name,
      reason: recommendation.bestOverallReason,
      id: bestOverall.id,
    });
  }

  const bestValue = recommendation.bestValueId
    ? byId.get(recommendation.bestValueId)
    : undefined;
  if (bestValue) {
    rows.push({
      label: valueLabel,
      name: bestValue.name,
      reason: recommendation.bestValueReason,
      id: bestValue.id,
    });
  }

  // Only worth its own row when it's genuinely additional information —
  // "nearest" on the same card already crowned Top pick or Best value is
  // covered by that card's second chip, not repeated as a row here.
  const nearest =
    recommendation.nearestId &&
    recommendation.nearestId !== recommendation.bestOverallId &&
    recommendation.nearestId !== recommendation.bestValueId
      ? byId.get(recommendation.nearestId)
      : undefined;
  if (nearest) {
    rows.push({
      label: "Nearest",
      name: nearest.name,
      reason:
        nearest.distanceKm != null
          ? `Closest to you — ${nearest.distanceKm}km away.`
          : null,
      id: nearest.id,
    });
  }

  // Server-verified before it ever reaches here (see SearchRecommendation's
  // own comment) — this just has to resolve both candidates to render the
  // factual comparison beneath it. Each kind brings its own comparable
  // fields, so the ROWS are built here and TradeoffNote just renders them.
  const tradeoffId = recommendation.tradeoff?.productId;
  const tradeoffItem = tradeoffId ? byId.get(tradeoffId) : undefined;
  const topPickId = recommendation.bestOverallId;

  const productById = new Map(products.map((p) => [p.productId, p]));
  const offerById = new Map(offers.map((o) => [o.id, o]));
  let differenceRows: { label: string; tradeoff: string; topPick: string }[] =
    [];
  if (tradeoffId && topPickId) {
    const tp = productById.get(tradeoffId);
    const op = topPickId ? productById.get(topPickId) : undefined;
    if (tp && op) differenceRows = buildDifferenceRows(tp, op);
    else {
      const to = offerById.get(tradeoffId);
      const oo = offerById.get(topPickId);
      if (to && oo) differenceRows = buildOfferDifferenceRows(to, oo);
    }
  }

  if (rows.length === 0 && !tradeoffItem) return null;

  return (
    // Deliberately container-less — same text treatment as FormattedReply's
    // prose so this reads as Velte still talking, not a widget dropped in.
    <div className="space-y-3">
      <p className="text-[15px] sm:text-base text-gray-800 leading-7">
        {recommendation.leadIn ?? fallbackLeadIn(recommendation)}
      </p>
      <div className="space-y-2.5">
        {rows.map((row) => (
          // A button, not a div (2026-08-29): naming a product and then
          // making the buyer hunt for it in the row below is the one place
          // this block was asking for work instead of saving it. Keyboard-
          // and screen-reader-addressable for free by being a real button;
          // `text-left` because a button centres its text by default and
          // this is a paragraph, not a label.
          <button
            key={row.label}
            type="button"
            onClick={(e) => scrollToCard(e.currentTarget, row.id)}
            title={`Show ${row.name}`}
            className="block w-full text-left rounded-lg -mx-1.5 px-1.5 py-1 transition-colors hover:bg-orange-50/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 cursor-pointer"
          >
            <span className="flex items-start gap-2">
              <span
                className={
                  row.label === "Top pick"
                    ? "shrink-0 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-semibold text-white mt-1"
                    : "shrink-0 rounded-full border border-orange-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-orange-600 mt-1"
                }
              >
                {row.label}
              </span>
              <span className="min-w-0 text-[15px] sm:text-base font-semibold text-[#023337] leading-snug underline decoration-transparent underline-offset-2 transition-colors group-hover:decoration-orange-300">
                {row.name}
              </span>
            </span>
            {row.reason && (
              <span className="mt-0.5 block text-sm leading-relaxed text-gray-600">
                {row.reason}
              </span>
            )}
          </button>
        ))}
      </div>
      {tradeoffItem && recommendation.tradeoff && (
        <TradeoffNote
          note={recommendation.tradeoff.note}
          name={tradeoffItem.name}
          rows={differenceRows}
        />
      )}
    </div>
  );
}

// The "there's a catch — want to see the difference?" moment. The sentence
// is the model's (server-verified as describing a real difference); the
// expanded comparison underneath is computed from the two listings' own
// fields, so the buyer can always check the claim against the data rather
// than take it on trust. No extra model call is involved in expanding it.
function TradeoffNote({
  note,
  name,
  rows,
}: {
  note: string;
  name: string;
  rows: { label: string; tradeoff: string; topPick: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-2">
        <span className="shrink-0 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 mt-1">
          Worth knowing
        </span>
        <span className="min-w-0 text-[15px] sm:text-base font-semibold text-[#023337] leading-snug">
          {name}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-gray-600">{note}</p>
      {rows.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-sm font-medium text-orange-600 hover:text-orange-700 cursor-pointer"
          >
            {open ? "Hide the difference" : "Show me the difference"}
          </button>
          {open && (
            <div className="mt-1 overflow-x-auto">
              <table className="w-full min-w-[20rem] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="py-1 pr-3 font-medium"> </th>
                    <th className="py-1 pr-3 font-medium">This one</th>
                    <th className="py-1 font-medium">Top pick</th>
                  </tr>
                </thead>
                <tbody className="align-top">
                  {rows.map((r) => (
                    <tr key={r.label} className="border-t border-gray-100">
                      <td className="py-1.5 pr-3 text-gray-500">{r.label}</td>
                      <td className="py-1.5 pr-3 text-gray-800">
                        {r.tradeoff}
                      </td>
                      <td className="py-1.5 text-gray-800">{r.topPick}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
