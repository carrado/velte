import { VendorCard } from "@/components/landing/VendorsPreview";
import type { VendorPreviewItem } from "@/types/store";

// A server component (renders VendorCard, a client component, across the
// boundary — same pattern as the parent page.tsx rendering StoreWhatsAppButton).
// Sits below the catalog so a buyer who's done browsing this store has
// somewhere to go next instead of dead-ending here. Renders nothing when the
// backend has nobody to suggest (same "return null on empty" convention as
// VendorsPreview on the homepage).
export default function SimilarVendors({
  vendors,
}: {
  vendors: VendorPreviewItem[];
}) {
  if (vendors.length === 0) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10">
      <h2 className="text-lg sm:text-xl font-bold text-[#023337] mb-4">
        Other vendors you may like
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {vendors.map((vendor) => (
          <VendorCard key={vendor.vendorId} item={vendor} />
        ))}
      </div>
    </section>
  );
}
