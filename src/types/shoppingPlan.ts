import type { SearchRecommendation } from "@/types/search";

// Shopping Plan (2026-09-18) — the shape of a persistent, deadline-driven
// plan, as velte-backend's shoppingPlan.controller.js's own toClientShape()
// returns it. A DIFFERENT shape from ShoppingPlanSnapshot (types/search.ts):
// that one is the light confirmation card shown in chat the moment the plan
// is created; this is the durable, persisted record the background
// monitoring job keeps updating every cycle.

export type ShoppingPlanItemStatus =
  | "pending"
  | "searching"
  | "found"
  | "no_match"
  | "failed";

export type ShoppingPlanStatus =
  | "active"
  | "monitoring"
  | "paused"
  | "completed"
  | "cancelled"
  | "expired";

export interface ShoppingPlanPricePoint {
  priceNaira: number;
  checkedAt: string;
}

export interface ShoppingPlanAvailabilityPoint {
  available: boolean;
  checkedAt: string;
}

export interface ShoppingPlanCandidate {
  id: string;
  source: "velte_product" | "velte_store" | "external";
  // Raw VendorMatch / StoreMatch / ExternalOffer, exactly as the backend
  // stored it — this frontend type deliberately doesn't pin its shape down
  // further than `unknown`, same restraint the backend's own model takes
  // (see ShoppingPlan.model.js's own candidateSchema comment); the detail
  // page reads only the handful of fields it actually renders, defensively.
  snapshot: unknown;
  firstDiscoveredAt: string;
  lastCheckedAt: string;
  priceHistory: ShoppingPlanPricePoint[];
  availabilityHistory: ShoppingPlanAvailabilityPoint[];
  // Per-candidate, not per-item (2026-09-20, replacing the item-level
  // `selectedCandidateId` + `purchased` pair this used to have) — explicit
  // product decision: Velte's own agent never executes a purchase on the
  // buyer's behalf, so a standing "this is my pick" state ahead of actually
  // buying it (and the "your pick went unavailable, approve this
  // replacement" flow that state existed to protect) added a step without
  // the app doing anything with that intermediate state. What's left is
  // the one fact worth recording: which listing the buyer actually bought.
  // At most one candidate per item is ever purchased — enforced by the
  // backend's own markItemPurchased, not by this type.
  purchased: boolean;
  // Snapshotted at the moment of purchase — this candidate's OWN price can
  // keep moving in later monitoring cycles, so "amount spent" freezes
  // independently of the live price history.
  purchasedPriceNaira: number | null;
}

export interface ShoppingPlanItem {
  id: string;
  order: number;
  label: string;
  category: string;
  quantity: number;
  priority: number;
  estimatedPriceNaira: number;
  fairPriceMinNaira: number;
  fairPriceMaxNaira: number;
  notes: string | null;
  status: ShoppingPlanItemStatus;
  lastCheckedAt: string | null;
  // `selectedCandidateId` and `suggestedAlternativeCandidateId` (spec §20's
  // "alternatives with approval") lived here until 2026-09-20, removed
  // together in the same explicit product decision — see
  // ShoppingPlanCandidate's own `purchased` comment above. `purchased`/
  // `purchasedPriceNaira` moved from here onto the candidate for the same
  // reason.
  //
  // Phase 3 — conversational management ("I don't need sportswear
  // anymore"). A soft flag, not a real deletion — the item's own discovery
  // history stays on the record; it just drops out of active totals and
  // rendering (see ShoppingPlanDetailPage's own visibleItems filter).
  removed: boolean;
  candidates: ShoppingPlanCandidate[];
}

export type ShoppingPlanBudgetStatus =
  | "within_budget"
  | "slightly_over_budget"
  | "significantly_over_budget"
  | null;

export interface ShoppingPlanCycleSummary {
  cycleId: string | null;
  cycleStart: string | null;
  cycleEnd: string | null;
  newOptions: number;
  priceDrops: number;
  priceIncreases: number;
  unavailable: number;
  previousEstimateNaira: number | null;
  currentEstimateNaira: number | null;
  budgetStatus: ShoppingPlanBudgetStatus;
  summaryGenerated: boolean;
  pushSent: boolean;
  smsSent: boolean;
}

export interface ShoppingPlan {
  id: string;
  goalText: string;
  deadlineDate: string;
  // budgetNaira/estimatedTotalNaira are the "planning" half of spec §8's
  // four values; spentTotalNaira is what's actually been bought (spec
  // §28). The third value spec §8 originally asked for,
  // selectedTotalNaira, was removed 2026-09-20 along with
  // `selectedCandidateId` itself — see ShoppingPlanCandidate's own
  // `purchased` comment.
  budgetNaira: number | null;
  estimatedTotalNaira: number;
  spentTotalNaira: number;
  status: ShoppingPlanStatus;
  nextMonitorAt: string;
  lastMonitoredAt: string | null;
  lastCycle: ShoppingPlanCycleSummary | null;
  createdAt: string;
  updatedAt: string;
  items: ShoppingPlanItem[];
}

/** The lighter, card-sized shape the Shopping Plans index lists — velte-
 *  backend's own toSummaryShape(), never a full item/candidate dump for
 *  every plan a buyer has ever started. */
export interface ShoppingPlanSummary {
  id: string;
  goalText: string;
  deadlineDate: string;
  budgetNaira: number | null;
  estimatedTotalNaira: number;
  spentTotalNaira: number;
  status: ShoppingPlanStatus;
  totalItems: number;
  foundCount: number;
  createdAt: string;
  updatedAt: string;
}

/** GET /api/shopping-plan/:id/recommendations' own shape (2026-09-21) — one
 *  entry per plan item, keyed by ShoppingPlanItem.id, reusing the SAME
 *  "Top pick" verdict regular chat search runs (see recommendResults.ts).
 *  `null` for an item with fewer than 2 available candidates, or whose call
 *  failed/timed out — the detail page falls back to its existing
 *  cheapest-available ordering exactly as if this route didn't exist. */
export type ShoppingPlanRecommendations = Record<
  string,
  SearchRecommendation | null
>;
