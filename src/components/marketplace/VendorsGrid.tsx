import { VendorCard } from "@/components/landing/VendorsPreview";
import { AskVeluxCard } from "./AskVeluxCard";
import type { VendorPreviewItem } from "@/types/store";

// The Vendors tab's content — same "AskVeluxCard as the last grid cell"
// pattern as MarketplaceBrowse's Listings tab, just with VendorCard's own
// 3-column layout (wider cards — sliding cover + avatar + sector chips need
// more room than a product tile).
export function VendorsGrid({ vendors }: { vendors: VendorPreviewItem[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {vendors.map((vendor) => (
        <VendorCard key={vendor.vendorId} item={vendor} />
      ))}
      <AskVeluxCard subtext="Looking for a specific business? Ask Velux and we'll help you find them." />
    </div>
  );
}
