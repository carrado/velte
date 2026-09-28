import type {
  AnyRecommendation,
  ComparisonTemplate as ComparisonTemplateData,
} from "@/types/search";
import { isComparisonTemplate } from "@/types/search";
import { scrollToCard } from "@/components/search/RecommendationPicks";

// The compare-turn result rendering, SIMPLIFIED (2026-09-28, explicit
// product decision). This file used to be one `ComparisonTemplate` block
// laid ABOVE the product carousel: an "About these results" note, an
// "I found N options" heading with criteria, a podium of picks, the full
// "Compare your options" table (option/price/location/source/best-for/
// strength/drawback/go), a "My recommendation" paragraph, and a "Trade-offs"
// guidance list.
//
// All of that is gone except three things, in this order:
//   1. the "About these results" note          — ComparisonNote, above the cards
//   2. the product cards, each now carrying its option's
//      best-for / key-strength / main-drawback — ComparisonDetailBlock, in the card
//   3. "My recommendation", last, with the chosen product's NAME highlighted and
//      clickable (scrolls to that card)         — ComparisonRecommendation, below
//
// The reasoning is that the table restated what the cards already show, and the
// podium restated what the recommendation already says — three overlapping
// tellings of one comparison. What survives is the disclosure (1), the facts
// on the things being compared (2), and the verdict (3).
//
// The server (comparisonTemplate.ts) still generates the fields this file no
// longer renders (criteria, podium ids, guidance, tradeoff) — deliberately
// left alone so the cut is easy to reverse and touches no model output.
// `RecommendationPicks.tsx`'s own non-compare block is untouched: a plain
// multi-result turn never carried any of this.

/** One option's three comparison judgments, as shown on its card. Every
 *  field is nullable model output (sanitized server-side), so a card renders
 *  only the lines it actually has. */
export interface ComparisonDetail {
  bestFor: string | null;
  keyStrength: string | null;
  mainDrawback: string | null;
}

/**
 * The comparison detail for one candidate id, or null when this turn isn't a
 * compare turn, the id isn't one of its rows, or the row carries nothing
 * worth showing. Accepts the whole recommendation (rather than requiring the
 * caller to narrow it first) so the carousel's render prop stays a one-liner.
 */
export function comparisonDetailFor(
  recommendation: AnyRecommendation | null | undefined,
  id: string,
): ComparisonDetail | null {
  if (!recommendation || !isComparisonTemplate(recommendation)) return null;
  const row = recommendation.rows.find((r) => r.id === id);
  if (!row) return null;
  if (!row.bestFor && !row.keyStrength && !row.mainDrawback) return null;
  return {
    bestFor: row.bestFor,
    keyStrength: row.keyStrength,
    mainDrawback: row.mainDrawback,
  };
}

/** The shared three-line block both product-shaped cards render — pulled out
 *  here so VendorResultCard and ExternalOfferCard can't drift apart on how a
 *  comparison detail is presented. Renders nothing when there is nothing. */
export function ComparisonDetailBlock({
  detail,
}: {
  detail: ComparisonDetail;
}) {
  const lines: { label: string; value: string; caution?: boolean }[] = [];
  if (detail.bestFor) lines.push({ label: "Best for", value: detail.bestFor });
  if (detail.keyStrength)
    lines.push({ label: "Key strength", value: detail.keyStrength });
  if (detail.mainDrawback)
    lines.push({
      label: "Main drawback",
      value: detail.mainDrawback,
      caution: true,
    });
  if (!lines.length) return null;

  return (
    <dl className="space-y-1 rounded-lg border border-gray-100 bg-gray-50/70 px-2.5 py-2 text-[11px] leading-relaxed">
      {lines.map((line) => (
        <div key={line.label} className="flex gap-1.5">
          <dt
            className={
              line.caution
                ? "shrink-0 font-semibold text-amber-700"
                : "shrink-0 font-semibold text-gray-500"
            }
          >
            {line.label}
          </dt>
          <dd className="min-w-0 text-gray-700">{line.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The disclosure that has to land BEFORE a single card is read: when what got
 * compared isn't quite what the buyer literally named (2026-09-05, found live:
 * "Toyota 2026 vs Lexus Jeep 2026" — Lexus makes no vehicle called "Jeep" —
 * quietly became a comparison of other vehicles with nothing saying so).
 *
 * Rendered above the carousel rather than with the rest of the block, because
 * its whole job is to be read first. Nothing to disclose → renders nothing.
 */
export function ComparisonNote({
  comparison,
}: {
  comparison: ComparisonTemplateData;
}) {
  if (!comparison.substitutionNote) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2.5">
      <span className="shrink-0 rounded-full border border-sky-300 bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700 mt-0.5">
        About these results
      </span>
      <p className="min-w-0 text-sm leading-relaxed text-ink">
        {comparison.substitutionNote}
      </p>
    </div>
  );
}

/**
 * "My recommendation" — the verdict, rendered LAST, under the cards it is
 * about.
 *
 * The chosen product's NAME is its own control, NOT a word inside the prose:
 * `recommendationNote` is free model text with no structural tie to any
 * candidate (see comparisonTemplate.ts), so the only reliable way to make
 * "the exact product" clickable is to take the name from the verified
 * `bestOverallId` → row and render it as the anchor. Tapping it scrolls to
 * and flashes that option's card — reusing scrollToCard's group-scoped
 * lookup, the same gesture RecommendationPicks' rows use.
 *
 * A degenerate template (the external fallback carries no bestOverallId)
 * still shows its note — just with no clickable name, never a dead button.
 */
export function ComparisonRecommendation({
  comparison,
}: {
  comparison: ComparisonTemplateData;
}) {
  const bestId = comparison.bestOverallId;
  const bestRow = bestId
    ? comparison.rows.find((r) => r.id === bestId)
    : undefined;
  if (!bestRow && !comparison.recommendationNote) return null;

  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold text-ink">My recommendation</h3>
      {bestRow && (
        <button
          type="button"
          onClick={(e) => scrollToCard(e.currentTarget, bestRow.id)}
          title={`Show ${bestRow.name}`}
          className="block text-left text-[15px] sm:text-base font-semibold text-orange-600 hover:text-orange-700 underline decoration-orange-200 underline-offset-2 transition-colors cursor-pointer"
        >
          {bestRow.name}
        </button>
      )}
      {comparison.recommendationNote && (
        <p className="text-sm leading-relaxed text-gray-700">
          {comparison.recommendationNote}
        </p>
      )}
    </div>
  );
}
