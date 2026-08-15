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
      {/* Redesigned 2026-08-16 — same textured-grid header treatment /about
          and /join already use (a subtle orange dot-grid, masked to fade out
          toward the edges), swapped in here so the browse page reads as a
          real destination in its own right rather than a bare h1 over the
          page background. */}
      <div className="relative overflow-hidden pt-28 pb-8 sm:pb-10">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(249,115,22,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.5) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage:
              "radial-gradient(ellipse 70% 60% at 50% 0%, black, transparent)",
          }}
        />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#023337] tracking-tight">
            Discover what&apos;s on Velte
          </h1>
          <p className="text-gray-500 mt-2 max-w-xl">
            Real listings from real vendors — chat with them directly, or ask
            Velux to search further.
          </p>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pb-20">
        <MarketplaceTabs items={items} vendors={vendors} />
      </div>
      <Footer />
    </div>
  );
}
