import { BuyerDiscoverTabs } from "@/components/buyer/BuyerDiscoverTabs";
import { getMarketplaceBrowse, getVendorsBrowse } from "@/lib/server/store";

/* The full browse catalog, moved off Home (see that page's own comment on
   why — Home is now the search-first "what do you need today?" surface,
   this is the "browse when you already know what you want" one, per the
   buyer-redesign brief's §1 "Browse when you know what you want / Ask
   Velte when you don't"). Same data/component this used to render on
   Home — getMarketplaceBrowse/getVendorsBrowse + MarketplaceTabs — just
   living at its own destination now that Home needs the room. */
export default async function BuyerDiscoverPage() {
  const [items, vendors] = await Promise.all([
    getMarketplaceBrowse().catch(() => []),
    getVendorsBrowse().catch(() => []),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 pb-6">
      <div className="mb-4">
        <h1 className="text-dash-title font-bold text-gray-900 mb-1">
          Discover
        </h1>
        <p className="text-dash-body text-gray-400">
          Real listings from real vendors — chat with them directly, or ask
          Velte to search further.
        </p>
      </div>
      <BuyerDiscoverTabs items={items} vendors={vendors} />
    </div>
  );
}
