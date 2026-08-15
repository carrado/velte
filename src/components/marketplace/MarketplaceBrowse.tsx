import { MagnifyingGlass } from "@phosphor-icons/react";
import { MarketplaceCard } from "@/components/landing/MarketplacePreview";
import { AskVeluxCard } from "./AskVeluxCard";
import type { SortOrder } from "./SortMenu";
import type { ListingKind } from "./KindToggle";
import type { PriceRange } from "./PriceRangeMenu";
import type { MarketplaceBrowseItem } from "@/types/store";

function matchesSearch(item: MarketplaceBrowseItem, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  return (
    item.name.toLowerCase().includes(q) ||
    item.storeName.toLowerCase().includes(q)
  );
}

function matchesKind(item: MarketplaceBrowseItem, kind: ListingKind): boolean {
  if (kind === "all") return true;
  return item.kind === kind;
}

// Quote-on-request items have no meaningful price to check against a
// range — excluded once a min/max is actually set (rather than treated as
// ₦0 or as always-matching), same reasoning as sortItems below excluding
// them from a price sort. A range item (price..priceMax) matches if that
// range overlaps the filter's [min, max] at all, not just if its low end
// does — a ₦15,000–₦25,000 listing should still show under a ₦20,000+
// filter.
function matchesPriceRange(
  item: MarketplaceBrowseItem,
  range: PriceRange,
): boolean {
  if (range.min == null && range.max == null) return true;
  if (item.quoteOnRequest) return false;
  const itemMin = item.price / 100;
  const itemMax = item.priceMax != null ? item.priceMax / 100 : itemMin;
  if (range.min != null && itemMax < range.min) return false;
  if (range.max != null && itemMin > range.max) return false;
  return true;
}

// Quote-on-request items have no meaningful price — sorted last regardless
// of direction rather than treated as ₦0 (which would otherwise always sort
// first on price-asc, ahead of every real price).
function sortItems(
  items: MarketplaceBrowseItem[],
  sort: SortOrder,
): MarketplaceBrowseItem[] {
  if (sort === "relevance") return items;
  const direction = sort === "price-asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    if (a.quoteOnRequest && b.quoteOnRequest) return 0;
    if (a.quoteOnRequest) return 1;
    if (b.quoteOnRequest) return -1;
    return (a.price - b.price) * direction;
  });
}

// No category filter here — categories only ever apply to product-kind
// retail listings (see sectors.ts's productCategoryId), so filtering by one
// would silently hide every service listing (categoryId is always null for
// those) from any category a buyer picked. A category rail that solved this
// (services always visible, only products narrowed) briefly shipped here
// 2026-08-16 and was removed the same day as unnecessary. Kind (Products/
// Services) and a price range took its place instead — both needed no new
// data and neither has a service-hiding edge case to work around.
//
// AskVeluxCard sits once, as the LAST cell of this same grid — not a
// separate footer/pill below it, and not interspersed through the feed. A
// buyer scanning a normal product grid shouldn't hit an "ad" mixed in every
// few items; one real card at the natural end of the feed does the same job
// without interrupting the browsing itself. Still true once filtered to
// zero matches — it doubles as the empty state's own next step ("ask Velux
// instead"), rather than needing separate empty-state artwork.
export function MarketplaceBrowse({
  items,
  search = "",
  kind = "all",
  priceRange = { min: null, max: null },
  sort = "relevance",
  renderSaveSlot,
}: {
  items: MarketplaceBrowseItem[];
  /** All default to "no filter applied" — the buyer Saved page renders this
   *  with just `items`/`renderSaveSlot` (an already-curated short list has
   *  no real use for the filter toolbar); only MarketplaceTabs (the
   *  /marketplace page and buyer Discover) passes these live. */
  search?: string;
  kind?: ListingKind;
  priceRange?: PriceRange;
  sort?: SortOrder;
  /** Buyer Discover/Saved pages pass this to overlay a SaveButton on every
   *  card — the public /marketplace page omits it, same as before this
   *  prop existed. */
  renderSaveSlot?: (item: MarketplaceBrowseItem) => React.ReactNode;
}) {
  const filtered = sortItems(
    items.filter(
      (item) =>
        matchesSearch(item, search) &&
        matchesKind(item, kind) &&
        matchesPriceRange(item, priceRange),
    ),
    sort,
  );

  const hasActiveFilter =
    search.trim() ||
    kind !== "all" ||
    priceRange.min != null ||
    priceRange.max != null;

  return (
    <div>
      {hasActiveFilter && filtered.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <MagnifyingGlass size={15} className="shrink-0" />
          Nothing matches these filters — try Velux instead.
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-2.5 gap-y-4 sm:gap-5">
        {filtered.map((item) => (
          <MarketplaceCard
            key={item.id}
            item={item}
            saveSlot={renderSaveSlot?.(item)}
          />
        ))}
        <AskVeluxCard subtext="Describe what you need and our AI searches across every vendor on Velte, not just what's shown here." />
      </div>
    </div>
  );
}
