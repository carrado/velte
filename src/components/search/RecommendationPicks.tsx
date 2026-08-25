import { useState } from "react";
import { fmt } from "@/lib/product-price";
import type { SearchRecommendation, VendorMatch } from "@/types/search";

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

// The chip labels one product card earns from a turn's recommendation —
// the WHICH half, worn on the card itself (VendorResultCard's pickBadges
// prop). A product can genuinely earn more than one ("Top pick" that's
// also "Nearest"); undefined keeps the card prop-free on turns with no
// recommendation at all.
export function pickBadgesFor(
  productId: string,
  recommendation: SearchRecommendation | null,
): string[] | undefined {
  if (!recommendation) return undefined;
  const badges: string[] = [];
  if (recommendation.bestOverallId === productId) badges.push("Top pick");
  if (recommendation.bestValueId === productId) badges.push("Best value");
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
export function RecommendationPicks({
  recommendation,
  products,
}: {
  recommendation: SearchRecommendation;
  products: VendorMatch[];
}) {
  const byId = new Map(products.map((p) => [p.productId, p]));

  const rows: { label: string; name: string; reason: string | null }[] = [];

  const bestOverall = recommendation.bestOverallId
    ? byId.get(recommendation.bestOverallId)
    : undefined;
  if (bestOverall) {
    rows.push({
      label: "Top pick",
      name: bestOverall.name,
      reason: recommendation.bestOverallReason,
    });
  }

  const bestValue = recommendation.bestValueId
    ? byId.get(recommendation.bestValueId)
    : undefined;
  if (bestValue) {
    rows.push({
      label: "Best value",
      name: bestValue.name,
      reason: recommendation.bestValueReason,
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
    });
  }

  // Server-verified before it ever reaches here (see SearchRecommendation's
  // own comment) — this just has to resolve both products to render the
  // factual comparison beneath it.
  const tradeoffProduct = recommendation.tradeoff
    ? byId.get(recommendation.tradeoff.productId)
    : undefined;
  const topPickForDiff = recommendation.bestOverallId
    ? byId.get(recommendation.bestOverallId)
    : undefined;

  if (rows.length === 0 && !tradeoffProduct) return null;

  return (
    // Deliberately container-less — same text treatment as FormattedReply's
    // prose so this reads as Velte still talking, not a widget dropped in.
    <div className="space-y-3">
      <p className="text-[15px] sm:text-base text-gray-800 leading-7">
        {recommendation.leadIn ?? fallbackLeadIn(recommendation)}
      </p>
      <div className="space-y-2.5">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="flex items-start gap-2">
              <span
                className={
                  row.label === "Top pick"
                    ? "shrink-0 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-semibold text-white mt-1"
                    : "shrink-0 rounded-full border border-orange-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-orange-600 mt-1"
                }
              >
                {row.label}
              </span>
              <span className="min-w-0 text-[15px] sm:text-base font-semibold text-[#023337] leading-snug">
                {row.name}
              </span>
            </div>
            {row.reason && (
              <p className="mt-0.5 text-sm leading-relaxed text-gray-600">
                {row.reason}
              </p>
            )}
          </div>
        ))}
      </div>
      {tradeoffProduct && recommendation.tradeoff && (
        <TradeoffNote
          note={recommendation.tradeoff.note}
          product={tradeoffProduct}
          topPick={topPickForDiff}
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
  product,
  topPick,
}: {
  note: string;
  product: VendorMatch;
  topPick: VendorMatch | undefined;
}) {
  const [open, setOpen] = useState(false);
  const rows = topPick ? buildDifferenceRows(product, topPick) : [];

  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-2">
        <span className="shrink-0 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 mt-1">
          Worth knowing
        </span>
        <span className="min-w-0 text-[15px] sm:text-base font-semibold text-[#023337] leading-snug">
          {product.name}
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
