import { useUserStore } from "@/store/userStore";
import type { BusinessType } from "@/types/user";

export function useBusinessType(): BusinessType {
  return useUserStore((s) => s.user?.businessType ?? "retail");
}

// ── Capability derivations ────────────────────────────────────────────────────
// businessType is one of retail | food | service | both | food_both. Rather than
// scatter enum checks, everything asks these three questions:
//   • is the product side dish-shaped?  (food, food_both)
//   • can it list products at all?       (everything except pure service)
//   • can it list services at all?       (service, both, food_both)

/** Product listings are dishes (prep time, modifiers, availability). */
export function isFoodBusiness(bt: BusinessType): boolean {
  return bt === "food" || bt === "food_both";
}

/** The account can create product/dish listings. */
export function businessOffersProducts(bt: BusinessType): boolean {
  return bt !== "service";
}

/** The account can create service listings. */
export function businessOffersServices(bt: BusinessType): boolean {
  return bt === "service" || bt === "both" || bt === "food_both";
}

/** Only accounts that do both need the per-listing product/service toggle. */
export function businessShowsKindToggle(bt: BusinessType): boolean {
  return businessOffersProducts(bt) && businessOffersServices(bt);
}

export function useIsFood(): boolean {
  return isFoodBusiness(useBusinessType());
}
