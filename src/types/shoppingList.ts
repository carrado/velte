import type {
  AnyRecommendation,
  ExternalOffer,
  VendorMatch,
} from "@/types/search";

// Shopping Lists (2026-09-12) — the shape of a background search job, as
// velte-backend's shoppingListJob.controller.js's own toClientShape()
// returns it. A DIFFERENT shape from ShoppingListSnapshot (types/search.ts):
// that one is the LLM-estimated draft shown before any real search has
// run; this is the durable, persisted job "Get these items" created,
// tracking each item's actual search progress and results.

export type ShoppingListItemStatus =
  | "pending"
  | "searching"
  | "found_velte"
  | "found_external"
  | "no_match"
  | "failed";

export type ShoppingListJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "completed_partial"
  | "failed";

export interface ShoppingListJobItem {
  id: string;
  order: number;
  label: string;
  category: string;
  quantity: number;
  estimatedPriceNaira: number;
  fairPriceMinNaira: number;
  fairPriceMaxNaira: number;
  notes: string | null;
  status: ShoppingListItemStatus;
  velteResults: VendorMatch[];
  externalOffers: ExternalOffer[];
  recommendation: AnyRecommendation | null;
}

export interface ShoppingListJob {
  id: string;
  goalText: string;
  status: ShoppingListJobStatus;
  /** The buyer's own stated budget, in naira — null when none was given.
   *  Carried over from the draft ShoppingListSnapshot at creation time. */
  budgetNaira: number | null;
  totalItems: number;
  nextItemIndex: number;
  createdAt: string;
  updatedAt: string;
  items: ShoppingListJobItem[];
}

/** The lighter, card-sized shape "My Shopping Lists" (spec §20) lists —
 *  velte-backend's own toSummaryShape(), never a full item/result dump for
 *  every job a buyer has ever started. */
export interface ShoppingListJobSummary {
  id: string;
  goalText: string;
  status: ShoppingListJobStatus;
  budgetNaira: number | null;
  estimatedTotalNaira: number;
  totalItems: number;
  categoryCount: number;
  foundCount: number;
  selectedCount: number;
  createdAt: string;
  updatedAt: string;
}
