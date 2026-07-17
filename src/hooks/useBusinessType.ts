import { useUserStore, EMPTY_SECTORS } from "@/store/userStore";
import { SECTOR_BY_VALUE } from "@/lib/sectors";
import type { SectorClassification } from "@/types/sectors";

// ── Capability derivations ────────────────────────────────────────────────────
// A sector's classification is one of retail | food | service | both |
// food_both. Rather than scatter enum checks, everything asks these three
// questions of a SINGLE classification:
//   • is the product side dish-shaped?  (food, food_both)
//   • can it list products at all?       (everything except pure service)
//   • can it list services at all?       (service, both, food_both)
// The Add Listing wizard (AddProductPage.tsx) feeds these a per-LISTING
// classification (whichever sector that listing is posted under) — these
// functions themselves don't care whether the input came from one listing or
// an account-wide union, so they're reused as-is by both.

/** Product listings are dishes (prep time, modifiers, availability). */
export function isFoodBusiness(c: SectorClassification): boolean {
  return c === "food" || c === "food_both";
}

/** Can create product/dish listings. */
export function businessOffersProducts(c: SectorClassification): boolean {
  return c !== "service";
}

/** Can create service listings. */
export function businessOffersServices(c: SectorClassification): boolean {
  return c === "service" || c === "both" || c === "food_both";
}

/** Only sectors that do both need the per-listing product/service toggle. */
export function businessShowsKindToggle(c: SectorClassification): boolean {
  return businessOffersProducts(c) && businessOffersServices(c);
}

// ── Account-wide shim ──────────────────────────────────────────────────────────
// Dashboard chrome (page headings, nav labels, which category set/tabs show)
// still needs ONE answer per account, even though a vendor can now have
// multiple sectors with different classifications. This is a compatibility
// shim, not a redesign: "true if ANY selected sector qualifies" — mirrors the
// backend's mergeBusinessType OR-merge, just as booleans instead of a
// re-derived composite enum (no client-side equivalent of the old
// account-wide BusinessType is needed since nothing stores one anymore).
export function useVendorSectorCapabilities() {
  const sectorValues = useUserStore((s) => s.user?.sectors ?? EMPTY_SECTORS);
  const classifications = sectorValues
    .map((v) => SECTOR_BY_VALUE[v]?.classification)
    .filter((c): c is SectorClassification => Boolean(c));

  return {
    hasFood: classifications.some(isFoodBusiness),
    offersProducts: classifications.some(businessOffersProducts),
    offersServices: classifications.some(businessOffersServices),
  };
}
