import type { SearchRecommendation } from "@/types/search";
import type {
  ShoppingPlanCandidate,
  ShoppingPlanItem,
} from "@/types/shoppingPlan";

// Shared, framework-agnostic reads over a Shopping Plan item's candidate list
// — extracted from ShoppingPlanDetailPage.tsx (2026-09-21) so the new
// recommendations route (server-side) can filter to the same "available"
// set the detail page (client-side) already renders against, without a
// "use client" component importing into a route handler or a second,
// possibly-drifting copy of the same three lines.

export function latestPrice(candidate: ShoppingPlanCandidate): number | null {
  return candidate.priceHistory.length
    ? candidate.priceHistory[candidate.priceHistory.length - 1].priceNaira
    : null;
}

export function latestAvailable(candidate: ShoppingPlanCandidate): boolean {
  return candidate.availabilityHistory.length
    ? candidate.availabilityHistory[candidate.availabilityHistory.length - 1]
        .available
    : true;
}

/** Cheapest-first, unavailable candidates dropped entirely — the buyer's
 *  own options list should never lead with an inflated or dead listing. */
export function sortedAvailableCandidates(
  item: ShoppingPlanItem,
): ShoppingPlanCandidate[] {
  return item.candidates
    .filter((c) => latestAvailable(c))
    .sort(
      (a, b) => (latestPrice(a) ?? Infinity) - (latestPrice(b) ?? Infinity),
    );
}

/** At most one candidate per item is ever purchased — the backend's own
 *  markItemPurchased enforces this — so a plain find is enough, mirroring
 *  shoppingPlan.controller.js's own identical helper. */
export function purchasedCandidateOf(
  item: ShoppingPlanItem,
): ShoppingPlanCandidate | null {
  return item.candidates.find((c) => c.purchased) ?? null;
}

/** A genuine "Top pick" id — the model's own verdict, but ONLY when it
 *  actually resolves to one of `available`'s own candidates this load. A
 *  stale/failed/not-yet-loaded call (or one whose pick has since gone
 *  unavailable) must never be shown as if it still applies — see this
 *  file's own callers for what "no genuine pick" (null) falls back to. */
export function topPickIdAmong(
  available: ShoppingPlanCandidate[],
  recommendation: SearchRecommendation | null,
): string | null {
  return recommendation?.bestOverallId &&
    available.some((c) => c.id === recommendation.bestOverallId)
    ? recommendation.bestOverallId
    : null;
}

/** The candidate this item's own UI leads with (2026-09-21) — a genuine
 *  Top pick when one resolves (see topPickIdAmong), else the cheapest
 *  available one (the same fallback this page has always used). ONE
 *  implementation, not three — this used to be computed separately in
 *  ItemRow (for its collapsed thumbnail), ItemComparison (for its hero
 *  card) and the plan-wide estimated total below, which is exactly the
 *  kind of copy that quietly drifts; all three now read this instead. */
export function recommendedCandidate(
  item: ShoppingPlanItem,
  recommendation: SearchRecommendation | null,
): ShoppingPlanCandidate | null {
  const available = sortedAvailableCandidates(item);
  const topPickId = topPickIdAmong(available, recommendation);
  if (topPickId) return available.find((c) => c.id === topPickId) ?? null;
  return available[0] ?? null;
}

/**
 * The plan-wide "Estimated" total the DETAIL PAGE shows (2026-09-21) —
 * deliberately CLIENT-SIDE ONLY, and deliberately different from the
 * backend's own `plan.estimatedTotalNaira`
 * (velte-backend shoppingPlan.controller.js's identically-named function).
 *
 * That backend number sums the CHEAPEST available candidate per item,
 * because the backend has no notion of a "Top pick" at all — that verdict
 * only exists once GET .../recommendations has been called from THIS
 * browser, and is never persisted (see that route's own header on why: an
 * LLM call per item per background cycle was exactly the cost this was
 * built to avoid). So this total answers "what would it cost to buy what
 * Velte is actually recommending", not "what would it cost to buy the
 * cheapest thing found for everything" — a real, deliberate difference,
 * not a bug to reconcile. It's why `plan.estimatedTotalNaira` itself is
 * UNUSED by the detail page any more; the Shopping Plans index card and any
 * SMS/push digest still show the backend's own cheapest-based number, since
 * neither of those has a recommendation to work from either.
 *
 * Same "no candidate yet contributes 0" rule as the backend version — never
 * a guess, just an honest running total of what's actually been found.
 */
export function estimatedTotalWithRecommendations(
  items: ShoppingPlanItem[],
  recommendations: Record<string, SearchRecommendation | null>,
): number {
  return items.reduce((sum, item) => {
    const purchased = purchasedCandidateOf(item);
    if (purchased) {
      return sum + (purchased.purchasedPriceNaira ?? 0) * item.quantity;
    }
    const candidate = recommendedCandidate(
      item,
      recommendations[item.id] ?? null,
    );
    const price = candidate ? latestPrice(candidate) : null;
    return sum + (price ?? 0) * item.quantity;
  }, 0);
}
