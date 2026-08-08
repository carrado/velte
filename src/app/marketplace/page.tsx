import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { MarketplaceTabs } from "@/components/marketplace/MarketplaceTabs";
import { getMarketplaceBrowse, getVendorsBrowse } from "@/lib/server/store";

// The full buyer-facing catalog — unlike the "/" homepage's
// MarketplacePreview (a capped, rotating 12-item teaser), this shows every
// eligible listing, tabbed alongside the full vendor directory. Deliberately
// never states a total count anywhere on the page.
export const metadata: Metadata = {
  title: "Marketplace",
  description:
    "Browse real listings and vendors on Velte — or ask Velux, our AI, to find exactly what you need.",
  alternates: {
    canonical: "/marketplace",
  },
};

export default async function MarketplacePage() {
  // Best-effort, in parallel — a backend hiccup shows an empty grid below
  // rather than taking the whole page down (same pattern as "/").
  const [items, vendors] = await Promise.all([
    getMarketplaceBrowse().catch(() => []),
    getVendorsBrowse().catch(() => []),
  ]);

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-28 pb-20">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#023337] tracking-tight">
            Discover what&apos;s on Velte
          </h1>
          <p className="text-gray-500 mt-1.5 max-w-xl">
            Real listings from real vendors — chat with them directly, or ask
            Velux to search further.
          </p>
        </div>
        <MarketplaceTabs items={items} vendors={vendors} />
      </div>
      <Footer />
    </div>
  );
}
