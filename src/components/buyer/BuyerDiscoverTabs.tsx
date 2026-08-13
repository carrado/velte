"use client";

import { MarketplaceTabs } from "@/components/marketplace/MarketplaceTabs";
import { SaveButton } from "@/components/buyer/SaveButton";
import type { MarketplaceBrowseItem, VendorPreviewItem } from "@/types/store";

/* A server component (discover/page.tsx) can't pass JSX-returning function
 * props across the server/client boundary — this thin client wrapper is
 * what lets that page stay a server component (plain data in) while still
 * wiring live SaveButtons into MarketplaceTabs's optional save slots. */
export function BuyerDiscoverTabs({
  items,
  vendors,
}: {
  items: MarketplaceBrowseItem[];
  vendors: VendorPreviewItem[];
}) {
  return (
    <MarketplaceTabs
      items={items}
      vendors={vendors}
      renderProductSaveSlot={(item) => (
        <SaveButton kind="product" targetId={item.id} />
      )}
      renderVendorSaveSlot={(vendor) => (
        <SaveButton kind="vendor" targetId={vendor.vendorId} />
      )}
    />
  );
}
