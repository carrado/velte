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

export interface SectorLeaf {
  /** Stable id persisted on User.sector, e.g. "restaurants_quick_service". */
  value: string;
  label: string;
  classification: SectorClassification;
  /** Shown as a Store sector-chip suggestion (see SECTOR_SUGGESTIONS). */
  featured?: boolean;
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
