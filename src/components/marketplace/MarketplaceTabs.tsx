"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { MarketplaceBrowse } from "./MarketplaceBrowse";
import { VendorsGrid } from "./VendorsGrid";
import type { MarketplaceBrowseItem, VendorPreviewItem } from "@/types/store";

type Tab = "listings" | "vendors";

// Same segmented-pill pattern as the public store page's own StoreTabs
// (Products/Services) — a buyer switches between individual listings and
// the vendor directory in place, rather than scrolling past a whole
// separate homepage-style section to reach vendors.
export function MarketplaceTabs({
  items,
  vendors,
}: {
  items: MarketplaceBrowseItem[];
  vendors: VendorPreviewItem[];
}) {
  const [active, setActive] = useState<Tab>("listings");

  return (
    <div>
      <div className="inline-flex p-1 mb-6 bg-gray-100 rounded-xl">
        <button
          type="button"
          onClick={() => setActive("listings")}
          className={tabClass(active === "listings")}
        >
          Listings
        </button>
        <button
          type="button"
          onClick={() => setActive("vendors")}
          className={tabClass(active === "vendors")}
        >
          Vendors
        </button>
      </div>

      {active === "listings" ? (
        <MarketplaceBrowse items={items} />
      ) : (
        <VendorsGrid vendors={vendors} />
      )}
    </div>
  );
}

function tabClass(isActive: boolean) {
  return cn(
    "px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors cursor-pointer",
    isActive
      ? "bg-white text-orange-600 shadow-sm"
      : "text-gray-500 hover:text-gray-700",
  );
}
