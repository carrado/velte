import { MarketplaceCard } from "@/components/landing/MarketplacePreview";
import { AskVeluxCard } from "./AskVeluxCard";
import type { MarketplaceBrowseItem } from "@/types/store";

// No category filter here — categories only ever apply to product-kind
// retail listings (see sectors.ts's productCategoryId), so filtering by one
// would silently hide every service listing (categoryId is always null for
// those) from any category a buyer picked. Simpler and more honest to just
// show everything.
//
// AskVeluxCard sits once, as the LAST cell of this same grid — not a
// separate footer/pill below it, and not interspersed through the feed. A
// buyer scanning a normal product grid shouldn't hit an "ad" mixed in every
// few items; one real card at the natural end of the feed does the same job
// without interrupting the browsing itself.
export function MarketplaceBrowse({
  items,
}: {
  items: MarketplaceBrowseItem[];
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-2.5 gap-y-4 sm:gap-5">
      {items.map((item) => (
        <MarketplaceCard key={item.id} item={item} />
      ))}
      <AskVeluxCard subtext="Describe what you need and our AI searches across every vendor on Velte, not just what's shown here." />
    </div>
  );
}
