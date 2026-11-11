import type { HubTimelineItem } from "@/types/hub";

/**
 * Checks whether a Hub item is a boosted product listing.
 * Boosted listings represent physical/service products promoted by a vendor.
 */
export function isBoostedProduct(item: HubTimelineItem): boolean {
  if (!item) return false;
  const isExplicitBoost = Boolean(
    (item as { boosted?: boolean }).boosted ||
    (item as { is_boosted?: boolean }).is_boosted ||
    (item as { isBoosted?: boolean }).isBoosted ||
    (item.listing as { boosted?: boolean } | undefined)?.boosted ||
    (item.listing as { is_boosted?: boolean } | undefined)?.is_boosted ||
    (item.listing as { sponsored?: boolean } | undefined)?.sponsored,
  );
  if (isExplicitBoost) return true;

  // If item is marked sponsored and is a product or not an explicit advert flyer
  if (item.sponsored) {
    if (Boolean(item.listing) || item.kind === "product") return true;
    if (!item.advertId && item.kind !== "promotion") return true;
  }

  return false;
}

/**
 * Checks whether a Hub item is a sponsored creative advert or banner flyer.
 */
export function isSponsoredAdvert(item: HubTimelineItem): boolean {
  if (!item) return false;
  if (isBoostedProduct(item)) return false;
  return Boolean(item.advertId || item.kind === "promotion" || item.sponsored);
}

/**
 * Checks whether a Hub item is either a boosted listing, advert, or promotion.
 */
export function isSponsoredOrAdvert(item: HubTimelineItem): boolean {
  return isBoostedProduct(item) || isSponsoredAdvert(item);
}

/**
 * Sorts timestamp newest first.
 */
function compareTimestampDesc(a: { at: string }, b: { at: string }): number {
  const timeA = new Date(a.at).getTime();
  const timeB = new Date(b.at).getTime();
  if (isNaN(timeA) && isNaN(timeB)) return 0;
  if (isNaN(timeA)) return 1;
  if (isNaN(timeB)) return -1;
  return timeB - timeA;
}

/**
 * Assembles the Hub timeline/feed strictly adhering to:
 * 1. "Newest updates come first before older ones"
 * 2. "Sponsored listings or ads come first and appear more frequently than other listings on the hub"
 *
 * Algorithm:
 * - Separates sponsored/ad listings from organic listings.
 * - Sorts both groups chronologically (newest first).
 * - Places sponsored listings/ads at the very top of the feed (position 0, and position 1 if multiple ads exist).
 * - Interleaves sponsored ads every 3 organic items so they appear significantly more frequently across the feed.
 */
export function assembleHubFeed(items: HubTimelineItem[]): HubTimelineItem[] {
  if (!items || items.length === 0) return [];

  const sponsored = items
    .filter(isSponsoredOrAdvert)
    .sort(compareTimestampDesc);
  const organic = items
    .filter((item) => !isSponsoredOrAdvert(item))
    .sort(compareTimestampDesc);

  // If there are no sponsored items, return organic newest first
  if (sponsored.length === 0) return organic;

  // If there are no organic items, return sponsored newest first
  if (organic.length === 0) return sponsored;

  const result: HubTimelineItem[] = [];
  let sponsoredCursor = 0;
  let organicCursor = 0;

  // 1. Sponsored listings or ads come first at the top of the feed
  result.push(sponsored[sponsoredCursor % sponsored.length]);
  sponsoredCursor++;

  // If multiple sponsored listings exist and there are multiple organic items,
  // lead with the second sponsored listing as well
  if (sponsored.length > 1 && organic.length >= 2) {
    result.push(sponsored[sponsoredCursor % sponsored.length]);
    sponsoredCursor++;
  }

  // 2. Interleave: every 3 organic items, repeat/cycle a sponsored listing
  // so sponsored ads appear much more frequently than regular listings
  while (organicCursor < organic.length) {
    result.push(organic[organicCursor]);
    organicCursor++;

    if (organicCursor % 3 === 0) {
      result.push(sponsored[sponsoredCursor % sponsored.length]);
      sponsoredCursor++;
    }
  }

  return result;
}

export interface AssembledFeedResult {
  /** All boosted listings that strictly occupy ONLY the top spot (in carousel format) */
  boostedListings: HubTimelineItem[];
  /** Backwards compatibility alias for single leader card */
  boostedLeader: HubTimelineItem | null;
  /** The timeline feed items with sponsored adverts sandwiched every 2 or 3 listings */
  feed: HubTimelineItem[];
}

/**
 * Assembles the timeline feed:
 * 1. Boosted listings strictly occupy ONLY the top spot in a carousel format.
 * 2. Sponsored adverts are sandwiched after every 2 or 3 listings as you scroll.
 * 3. Both boosted listings and adverts are clearly partitioned for distinct rendering.
 */
export function assembleTimelineWithSandwichedAds(
  items: HubTimelineItem[],
): AssembledFeedResult {
  if (!items || items.length === 0) {
    return { boostedListings: [], boostedLeader: null, feed: [] };
  }

  // 1. Separate items by role
  const boostedProducts = items
    .filter(isBoostedProduct)
    .sort(compareTimestampDesc);
  const sponsoredAds = items
    .filter(isSponsoredAdvert)
    .sort(compareTimestampDesc);
  const organicListings = items
    .filter((item) => !isBoostedProduct(item) && !isSponsoredAdvert(item))
    .sort(compareTimestampDesc);

  // Boosted listings strictly occupy ONLY the top spot in a carousel format
  const boostedListings = boostedProducts;
  const boostedLeader = boostedProducts[0] ?? null;

  // Adverts that display after 2 or 3 listings as you scroll
  const adPool = sponsoredAds;

  const feed: HubTimelineItem[] = [];
  let adCursor = 0;
  let organicCursor = 0;
  let listingsSinceAd = 0;
  let gapIndex = 0;
  // Deterministic initial gap
  let nextAdGap = 2;

  while (organicCursor < organicListings.length) {
    feed.push(organicListings[organicCursor]);
    organicCursor++;
    listingsSinceAd++;

    if (adPool.length > 0 && listingsSinceAd >= nextAdGap) {
      feed.push(adPool[adCursor % adPool.length]);
      adCursor++;
      listingsSinceAd = 0;
      // Deterministically alternate between 2 and 3 listings
      gapIndex++;
      nextAdGap = gapIndex % 2 === 0 ? 2 : 3;
    }
  }

  // If there are no organic listings but there are sponsored ads, show them in feed
  if (organicListings.length === 0 && adPool.length > 0) {
    feed.push(...adPool);
  }

  return { boostedListings, boostedLeader, feed };
}

/**
 * Finds new items in incoming that were not present in existing.
 */
export function getNewTimelineItems(
  incoming: HubTimelineItem[],
  existing: HubTimelineItem[],
): HubTimelineItem[] {
  if (!incoming || incoming.length === 0) return [];
  if (!existing || existing.length === 0) return incoming;

  const existingIds = new Set(existing.map((item) => item.id));
  return incoming
    .filter((item) => !existingIds.has(item.id))
    .sort(compareTimestampDesc);
}
