import { VendorCard } from "@/components/landing/VendorsPreview";
import { AskVeluxCard } from "./AskVeluxCard";
import type { VendorPreviewItem } from "@/types/store";

function matchesSearch(vendor: VendorPreviewItem, query: string): boolean {
  if (!query.trim()) return true;
  return vendor.name.toLowerCase().includes(query.trim().toLowerCase());
}

// The Vendors tab's content — same "AskVeluxCard as the last grid cell"
// pattern as MarketplaceBrowse's Listings tab, just with VendorCard's own
// 3-column layout (wider cards — sliding cover + avatar + sector chips need
// more room than a product tile).
export function VendorsGrid({
  vendors,
  search = "",
  renderSaveSlot,
}: {
  vendors: VendorPreviewItem[];
  /** Defaults to "no filter" — only MarketplaceTabs passes this live (see
   *  MarketplaceBrowse's own comment on the same pattern); the buyer Saved
   *  page's already-curated "vendors you follow" list has no real use for
   *  a name filter. */
  search?: string;
  /** Buyer Discover/Saved pages pass this to overlay a Follow SaveButton on
   *  every card — the public /marketplace page omits it. */
  renderSaveSlot?: (vendor: VendorPreviewItem) => React.ReactNode;
}) {
  const filtered = vendors.filter((v) => matchesSearch(v, search));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {filtered.map((vendor) => (
        <VendorCard
          key={vendor.vendorId}
          item={vendor}
          saveSlot={renderSaveSlot?.(vendor)}
        />
      ))}
      <AskVeluxCard subtext="Looking for a specific business? Ask Velte and we'll help you find them." />
    </div>
  );
}
