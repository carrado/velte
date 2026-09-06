import type {
  ComparisonTemplate as ComparisonTemplateData,
  ExternalOffer,
  VendorMatch,
} from "@/types/search";
import {
  buildDifferenceRows,
  buildOfferDifferenceRows,
  scrollToCard,
  TradeoffNote,
} from "@/components/search/RecommendationPicks";

// The "Universal Comparison Template" (2026-09-05) — the literal structured
// look (criteria line, best-overall/best-value/third-pick podium, a full
// comparison table, a recommendation paragraph, "choose X if…" guidance)
// requested for a genuine COMPARE turn: the buyer selected the Compare tool,
// or their own words unmistakably asked to weigh options against each other
// (classifyScopeTool — see comparisonRule.ts). This deliberately REVERSES the 2026-08-25 decision
// that stripped headers/containers/icons out of the ordinary recommendation
// picks (RecommendationPicks.tsx, still used unchanged on every other
// multi-result turn) — Compare is its own explicit mode, asked for by name,
// and reads as a distinct, structured artifact rather than conversation.
//
// Same division of labor as everywhere else in this codebase: every string
// here that isn't a name/price/emoji-label was written and sanitized
// server-side (comparisonTemplate.ts) — this component only lays it out and
// computes the same purely-factual "show me the difference" table
// RecommendationPicks already does, from the real candidate data, never
// from the model's own words.
//
// A turn is only ever Velte products OR external offers, never both (see
// comparisonTemplate.ts's own comment on why the source merge stays out of
// scope for now) — `products`/`offers` mirror RecommendationPicks' own
// props for that reason, and the table's `source` column is included
// per-row regardless so a future merge needs no shape change here.

const PICK_EMOJI: Record<string, string> = {
  overall: "🏆",
  value: "💰",
  third: "⭐",
};

function sourceLabel(source: "velte" | "external"): string {
  return source === "velte" ? "Velte" : "External";
}

export function ComparisonTemplate({
  comparison,
  products = [],
  offers = [],
}: {
  comparison: ComparisonTemplateData;
  products?: VendorMatch[];
  offers?: ExternalOffer[];
}) {
  const productById = new Map(products.map((p) => [p.productId, p]));
  const offerById = new Map(offers.map((o) => [o.id, o]));
  const rowById = new Map(comparison.rows.map((r) => [r.id, r]));

  const podium: {
    kind: "overall" | "value" | "third";
    label: string;
    id: string;
    name: string;
    priceLabel: string;
    reason: string | null;
    bestFor: string | null;
  }[] = [];

  if (comparison.bestOverallId) {
    const row = rowById.get(comparison.bestOverallId);
    if (row) {
      podium.push({
        kind: "overall",
        label: "Best overall",
        id: row.id,
        name: row.name,
        priceLabel: row.priceLabel,
        reason: comparison.bestOverallReason,
        bestFor: row.bestFor,
      });
    }
  }
  if (comparison.bestValueId) {
    const row = rowById.get(comparison.bestValueId);
    if (row) {
      podium.push({
        kind: "value",
        label: "Best value",
        id: row.id,
        name: row.name,
        priceLabel: row.priceLabel,
        reason: comparison.bestValueReason,
        bestFor: row.bestFor,
      });
    }
  }
  if (comparison.thirdPickId && comparison.thirdPickLabel) {
    const row = rowById.get(comparison.thirdPickId);
    if (row) {
      podium.push({
        kind: "third",
        label: comparison.thirdPickLabel,
        id: row.id,
        name: row.name,
        priceLabel: row.priceLabel,
        reason: comparison.thirdPickReason,
        bestFor: row.bestFor,
      });
    }
  }

  const guidanceRows = comparison.guidance
    .map((g) => {
      const row = rowById.get(g.id);
      return row
        ? { name: row.name, id: row.id, condition: g.condition }
        : null;
    })
    .filter((g): g is { name: string; id: string; condition: string } =>
      Boolean(g),
    );

  const tradeoffId = comparison.tradeoff?.productId;
  const tradeoffRow = tradeoffId ? rowById.get(tradeoffId) : undefined;
  let differenceRows: { label: string; tradeoff: string; topPick: string }[] =
    [];
  if (tradeoffId && comparison.bestOverallId) {
    const tp = productById.get(tradeoffId);
    const op = productById.get(comparison.bestOverallId);
    if (tp && op) differenceRows = buildDifferenceRows(tp, op);
    else {
      const to = offerById.get(tradeoffId);
      const oo = offerById.get(comparison.bestOverallId);
      if (to && oo) differenceRows = buildOfferDifferenceRows(to, oo);
    }
  }

  if (comparison.rows.length === 0) return null;
  const uniformSource = comparison.rows[0]?.source;
  const sourceIsMixed = comparison.rows.some((r) => r.source !== uniformSource);
  // Only shown when at least one row actually knows where it is — a column
  // of em-dashes tells the buyer nothing and costs a fifth of the width.
  const showLocation = comparison.rows.some((r) => r.location);
  // What the next step actually IS for this kind of option, named honestly:
  // an external listing goes out to the shop's own page, a Velte vendor
  // goes to a card with a real chat button on it.
  const actionLabel = uniformSource === "external" ? "View listing" : "View";

  return (
    // NO data-results-group here, deliberately. scrollToCard walks UP from
    // the clicked row to the nearest [data-results-group] and then searches
    // INSIDE it for the card — so marking this block as its own group would
    // find a container that holds the comparison but none of the cards,
    // and every pick would silently fail to scroll. The group is the
    // wrapper in SearchHome.tsx that holds this block AND the carousel.
    <div className="space-y-4">
      {/* Said BEFORE anything else on screen, deliberately (2026-09-05, found
          live: "Toyota 2026 vs Lexus Jeep 2026" — Lexus makes no vehicle
          called that — quietly turned into a table of Highlander/Camry/
          RAV4/TX 350 with nothing telling the buyer their exact wording
          wasn't what got compared). A substitution disclosed AFTER the
          numbers is a buyer who has already half-trusted a table before
          learning it isn't quite what they asked for; this has to land
          before the count, the podium, or a single price. Distinct label
          and colour from TradeoffNote's "Worth knowing" below — that one is
          about a genuine catch on a specific pick, this is about whether
          the search itself matched what was named, and both can appear on
          the same screen. */}
      {comparison.substitutionNote && (
        <div className="flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2.5">
          <span className="shrink-0 rounded-full border border-sky-300 bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700 mt-0.5">
            About these results
          </span>
          <p className="min-w-0 text-sm leading-relaxed text-[#023337]">
            {comparison.substitutionNote}
          </p>
        </div>
      )}

      <div className="space-y-1">
        <h2 className="text-[15px] sm:text-base font-semibold text-[#023337]">
          I found {comparison.rows.length} option
          {comparison.rows.length === 1 ? "" : "s"}
          {sourceIsMixed
            ? " — from Velte and external sources"
            : uniformSource === "external"
              ? " — from external sources, not yet on Velte"
              : " on Velte"}
        </h2>
        {comparison.criteria.length > 0 && (
          <p className="text-sm text-gray-600">
            Compared on:{" "}
            <span className="text-gray-800">
              {comparison.criteria.join(" · ")}
            </span>
          </p>
        )}
        {comparison.leadIn && (
          <p className="text-sm text-gray-600">{comparison.leadIn}</p>
        )}
      </div>

      {podium.length > 0 && (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {podium.map((pick) => (
            <button
              key={pick.kind}
              type="button"
              onClick={(e) => scrollToCard(e.currentTarget, pick.id)}
              title={`Show ${pick.name}`}
              className="text-left rounded-xl border border-orange-100 bg-orange-50/50 p-3 transition-colors hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 cursor-pointer"
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold text-orange-700">
                <span aria-hidden>{PICK_EMOJI[pick.kind]}</span>
                {pick.label}
              </span>
              <span className="mt-1 block text-[15px] font-semibold text-[#023337] leading-snug">
                {pick.name}
              </span>
              <span className="block text-sm text-gray-600">
                {pick.priceLabel}
              </span>
              {pick.reason && (
                <span className="mt-1 block text-sm leading-relaxed text-gray-600">
                  {pick.reason}
                </span>
              )}
              {pick.bestFor && (
                <span className="mt-1 block text-xs text-gray-500">
                  Best for: {pick.bestFor}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {comparison.rows.length > 1 && (
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold text-[#023337]">
            Compare your options
          </h3>
          {/* Always open, never behind a toggle: the buyer asked to compare,
              so the comparison is the answer, not an optional extra.
              Scrolls inside its OWN container so a wide table never makes
              the whole thread scroll sideways.

              overscroll-x-contain matters on mobile specifically: without
              it, swiping past either end of the table chains the gesture up
              to the page, which on iOS Safari and Chrome Android reads as a
              back/forward navigation — the buyer swipes to see one more
              column and leaves the conversation instead. */}
          <div className="overflow-x-auto overscroll-x-contain rounded-lg border border-gray-100">
            {/* Wide enough that the three prose columns get real width
                instead of wrapping to two words a line. Safe to be generous
                now that the container is genuinely swipable. */}
            <table className="w-full min-w-[48rem] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="py-2 pl-3 pr-3 font-medium">Option</th>
                  <th className="py-2 pr-3 font-medium">Price</th>
                  {showLocation && (
                    <th className="py-2 pr-3 font-medium">Location</th>
                  )}
                  {sourceIsMixed && (
                    <th className="py-2 pr-3 font-medium">Source</th>
                  )}
                  <th className="py-2 pr-3 font-medium">Best for</th>
                  <th className="py-2 pr-3 font-medium">Key strength</th>
                  <th className="py-2 pr-3 font-medium">Main drawback</th>
                  <th className="py-2 pr-3 font-medium">
                    <span className="sr-only">Go to option</span>
                  </th>
                </tr>
              </thead>
              <tbody className="align-top">
                {comparison.rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-gray-100 cursor-pointer hover:bg-orange-50/40"
                    onClick={(e) => scrollToCard(e.currentTarget, row.id)}
                  >
                    <td className="py-2 pl-3 pr-3 font-medium text-[#023337]">
                      {row.name}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap text-gray-800">
                      {row.priceLabel}
                    </td>
                    {showLocation && (
                      <td className="py-2 pr-3 text-gray-600">
                        {row.location ?? "—"}
                      </td>
                    )}
                    {sourceIsMixed && (
                      <td className="py-2 pr-3 text-gray-600">
                        {sourceLabel(row.source)}
                      </td>
                    )}
                    <td className="py-2 pr-3 text-gray-600">
                      {row.bestFor ?? "—"}
                    </td>
                    <td className="py-2 pr-3 text-gray-600">
                      {row.keyStrength ?? "—"}
                    </td>
                    <td className="py-2 pr-3 text-gray-600">
                      {row.mainDrawback ?? "—"}
                    </td>
                    {/* The "take the buyer to the next step" column. It
                        moves to that option's own card, which is where the
                        real action lives (Chat on WhatsApp for a Velte
                        vendor, the outbound link for an external listing).
                        Deliberately NOT a second contact button: duplicating
                        the WhatsApp CTA would risk reporting two leads for
                        one buyer intent (see VendorResultCard's own note). */}
                    <td className="py-2 pr-3 whitespace-nowrap text-right">
                      <span className="text-xs font-medium text-orange-600">
                        {actionLabel} →
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Phone-only affordance. The table has always been horizontally
              scrollable, but nothing on screen said so — at 40rem against a
              ~390px viewport the last columns simply looked absent rather
              than reachable. Hidden from sm: up, where the whole table fits
              and the hint would be a lie. */}
          <p className="text-xs text-gray-400 sm:hidden">
            Swipe the table sideways to see every column →
          </p>
          {!sourceIsMixed && (
            <p className="text-xs text-gray-400">
              {uniformSource === "velte"
                ? "All options above are on Velte."
                : // Made more explicit (2026-09-05, per explicit request): the
                  // old wording said there's no chat but left WHAT happens
                  // instead unsaid. Now it says it — these sellers are not
                  // Velte vendors, and tapping a listing takes the buyer away
                  // to buy or contact them directly, not into a Velte chat.
                  "These sellers are not Velte vendors — tapping a listing takes you to their own page to contact or buy from them directly."}
            </p>
          )}
        </div>
      )}

      {comparison.recommendationNote && (
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-[#023337]">
            My recommendation
          </h3>
          <p className="text-sm leading-relaxed text-gray-700">
            {comparison.recommendationNote}
          </p>
        </div>
      )}

      {guidanceRows.length > 0 && (
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-[#023337]">Trade-offs</h3>
          <ul className="space-y-1">
            {guidanceRows.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={(e) => scrollToCard(e.currentTarget, g.id)}
                  className="text-left text-sm leading-relaxed text-gray-700 hover:text-orange-700 cursor-pointer"
                >
                  Choose <span className="font-semibold">{g.name}</span> if{" "}
                  {g.condition}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tradeoffRow && comparison.tradeoff && (
        <TradeoffNote
          note={comparison.tradeoff.note}
          name={tradeoffRow.name}
          rows={differenceRows}
        />
      )}
    </div>
  );
}
