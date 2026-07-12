/**
 * Derives businessType at signup:
 * - "retail"    — sells stocked products
 * - "food"      — dish-based products (prep time, modifiers, availability)
 * - "service"   — job-based, no stock/products
 * - "both"      — retail products AND services (phone shop that repairs, etc.)
 * - "food_both" — dish products AND services (e.g. catering: sells the food,
 *                 hired for the event). Like "both" but the product side is a
 *                 menu, not a stocked shelf.
 */
export type SectorClassification =
  | "retail"
  | "food"
  | "service"
  | "both"
  | "food_both";

/**
 * Optional per-sector tailoring of the Add-Offering wizard. Tailors content
 * INSIDE the existing blocks only — never adds/removes blocks or forks the
 * component tree (that stays driven by `classification`). Sectors without a
 * config get today's generic behavior, so this rolls out incrementally.
 */
export interface SectorListingConfig {
  /**
   * Which SERVICE_DETAIL_PRESETS groups apply to this sector's service
   * listings, in display order. "General" is always appended — `[]` means
   * General only. Omitted = the full ungrouped list (legacy behavior).
   */
  presetGroups?: string[];
  /**
   * Default the product-category dropdown to this id — applied only when the
   * vendor's own category list actually contains it.
   */
  productCategoryId?: string;
  /** Sector-flavored placeholder copy for the Basics block, per listing kind. */
  productNamePlaceholder?: string;
  productDescriptionPlaceholder?: string;
  serviceNamePlaceholder?: string;
  serviceDescriptionPlaceholder?: string;
}

export interface SectorLeaf {
  /** Stable id persisted on User.sector, e.g. "restaurants_quick_service". */
  value: string;
  label: string;
  classification: SectorClassification;
  /** Per-sector Add-Offering tailoring; absent = generic defaults. */
  listingConfig?: SectorListingConfig;
}

export interface SectorCategory {
  id: string;
  label: string;
  sectors: SectorLeaf[];
}

export interface SectorPickerProps {
  value: string;
  onSelect: (leaf: SectorLeaf) => void;
  error?: string;
}

/** One candidate detail to ask the buyer about — `name` is the underlying
 * preset field (e.g. "Turnaround Time"), `example` seeds a natural phrasing. */
export interface ClarifierField {
  name: string;
  example?: string;
}

/** Output of getSectorClarifiers(query) — a search-turn's detected sector
 * plus the 2-3 fields worth asking the buyer about, if the query is thin.
 * Never a hard filter: only ever used to pick clarifying questions and
 * enrich the query text (see sectorClarifiers.ts). */
export interface SectorClarifiers {
  sectorValue: string;
  sectorLabel: string;
  businessType: SectorClassification;
  fields: ClarifierField[];
}
