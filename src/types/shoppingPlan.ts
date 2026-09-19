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
  selectedCandidateId: string | null;
  // Phase 2 — "alternatives with approval" (spec §20). Set by the
  // background job the moment the SELECTED candidate goes unavailable;
  // never auto-applied. The detail page surfaces this as its own approve/
  // dismiss card, distinct from the ordinary candidate list.
  suggestedAlternativeCandidateId: string | null;
  purchased: boolean;
  purchasedPriceNaira: number | null;
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
  // The four values spec §8 asks the UI to distinguish: the buyer's own
  // target, Velte's live estimate, the value of what's been SELECTED
  // (bought or not), and what's actually been bought (spec §28).
  budgetNaira: number | null;
  estimatedTotalNaira: number;
  selectedTotalNaira: number;
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
