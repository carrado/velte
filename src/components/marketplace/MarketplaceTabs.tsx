"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { MarketplaceBrowse } from "./MarketplaceBrowse";
import { VendorsGrid } from "./VendorsGrid";
import { MarketplaceSearchBox } from "./MarketplaceSearchBox";
import { KindToggle, type ListingKind } from "./KindToggle";
import { PriceRangeMenu, type PriceRange } from "./PriceRangeMenu";
import { SortMenu, type SortOrder } from "./SortMenu";
import type { MarketplaceBrowseItem, VendorPreviewItem } from "@/types/store";

type Tab = "listings" | "vendors";

// Redesigned 2026-08-16 — the segmented pill switcher stays (same pattern
// as the public store page's StoreTabs), now sitting inside a proper
// toolbar: tabs + search on the first row, kind/price/sort on a second
// (Listings only — none of the three apply to Vendors: no kind split, no
// price, nothing to sort by price with). A category rail briefly sat on
// that second row instead (see CategoryRail.tsx, since deleted) — swapped
// for kind + price the same day: both use data every listing already has,
// neither needed a service-hiding edge case worked around the way category
// filtering did. Search/kind/price/sort all filter what's already been
// fetched client-side; nothing here calls the backend again.
export function MarketplaceTabs({
  items,
  vendors,
  renderProductSaveSlot,
  renderVendorSaveSlot,
}: {
  items: MarketplaceBrowseItem[];
  vendors: VendorPreviewItem[];
  renderProductSaveSlot?: (item: MarketplaceBrowseItem) => React.ReactNode;
  renderVendorSaveSlot?: (vendor: VendorPreviewItem) => React.ReactNode;
}) {
  const [active, setActive] = useState<Tab>("listings");
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<ListingKind>("all");
  const [priceRange, setPriceRange] = useState<PriceRange>({
    min: null,
    max: null,
  });
  const [sort, setSort] = useState<SortOrder>("relevance");

  // Search is per-tab context but shared state — switching tabs keeps
  // whatever was typed rather than clearing it, since "leather" is just as
  // reasonable a filter on Vendors (business name) as on Listings (product
  // name). Kind/price/sort are reset implicitly by only ever being read on
  // the Listings branch below.
  return (
    <div>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3 sm:p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
          <div className="inline-flex p-1 bg-gray-100 rounded-xl shrink-0">
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
          <MarketplaceSearchBox
            value={search}
            onChange={setSearch}
            placeholder={
              active === "listings"
                ? "Search products & services…"
                : "Search businesses…"
            }
          />
        </div>

        {active === "listings" && (
          <div className="flex items-center gap-2 overflow-x-auto border-t border-gray-100 pt-3">
            <KindToggle value={kind} onChange={setKind} />
            <div className="flex items-center gap-2 ml-auto">
              <PriceRangeMenu value={priceRange} onChange={setPriceRange} />
              <SortMenu value={sort} onChange={setSort} />
            </div>
          </div>
        )}
      </div>

      {active === "listings" ? (
        <MarketplaceBrowse
          items={items}
          search={search}
          kind={kind}
          priceRange={priceRange}
          sort={sort}
          renderSaveSlot={renderProductSaveSlot}
        />
      ) : (
        <VendorsGrid
          vendors={vendors}
          search={search}
          renderSaveSlot={renderVendorSaveSlot}
        />
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
