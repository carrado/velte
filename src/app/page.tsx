import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import { WaysToHelp } from "@/components/landing/WaysToHelp";
import { MarketplacePreview } from "@/components/landing/MarketplacePreview";
import { VeluxShowcase } from "@/components/landing/VeluxShowcase";
import { RequestShowcase } from "@/components/landing/RequestShowcase";
import { VendorsPreview } from "@/components/landing/VendorsPreview";
import { RegisterCta } from "@/components/landing/RegisterCta";
import FAQ from "@/components/landing/FAQ";
import Footer from "@/components/landing/Footer";
import StandaloneHomeRedirect from "@/components/StandaloneHomeRedirect";
import { getMarketplacePreview, getVendorsPreview } from "@/lib/server/store";

// Velte's homepage — redesigned for the pivot (replaces the old
// pre-pivot "WhatsApp AI Sales Rep" marketing site that used to live at
// /vendors). The buyer search experience itself lives at /velux.
//
// Redesigned again 2026-08-13: leads with a real Velux search box instead
// of a generic headline (see Hero.tsx), keeps real-catalog browsing
// (MarketplacePreview) right below it, surfaces Buyer Requests and a
// comparison example much earlier, and de-emphasized the vendor pitch down
// to a single closing strip (VendorPitch.tsx, since removed — see below).
//
// Trimmed hard 2026-08-15 — the 2026-08-13 pass added the right SECTIONS
// but too many of them ran long (large cards, full paragraphs, uncapped
// grids), so the page still read as "explain the product" rather than
// "demonstrate it." This pass: shrank Hero's copy and made its composer the
// visually dominant element, collapsed WaysToHelp into a one-line-each row
// establishing the site's three verbs (Find/Request/Choose, repeated as
// section headings below rather than a rotating cast of search/discover/
// browse/ask synonyms), capped MarketplacePreview/VendorsPreview to 6/3
// items instead of showing everything the endpoint returns, reordered
// VeluxShowcase before RequestShowcase and rewrote its example around an
// image-search interaction (the one case a hero text box can't demonstrate
// on its own), dropped the standalone WhyVelte section (its content didn't
// earn a full section once the rest of the page got more demonstrative),
// and rewrote RegisterCta's three description-cards down to a one-line
// pitch + a compact pill row.
//
// VendorPitch retired entirely 2026-08-14 (file deleted, not just unused)
// once /join became the single unified entry point for both buyer and
// vendor journeys — RegisterCta was rewritten to speak to both audiences
// itself (two quiet "Finding things" / "Selling things" columns, no
// separate "FOR BUSINESSES" section underneath it), so a whole second
// section just to repeat "click here to sign up" stopped earning its
// space. See RegisterCta.tsx's own comment.
//
// CompareSection pulled 2026-08-15 (file deleted; the searchProducts tool's
// matching compareNote/buildCompareNote logic was reverted the same day) —
// built as a real "Velux picks a winner and says why" feature, but a live
// DB check showed the current catalog has no product with 2+ different
// vendors both pricing it, so it had nothing to ever compare in practice.
// Revisit once the catalog has real cross-vendor overlap. WaysToHelp's
// "Choose" item now points at /velux generally instead of a #compare
// anchor that no longer exists.
export const metadata: Metadata = {
  title: "Velte | Find anything nearby",
  description:
    "Describe what you need — Velte finds the nearest real vendor who actually has it, then connects you directly.",
  alternates: {
    canonical: "/",
  },
};

// Organization + WebSite structured data — helps Google associate the site
// with the Velte brand (knowledge panel eligibility) and its real social
// profiles. A SearchAction was added 2026-08-13 alongside Hero's own real
// `?q=`/`auto=1` handoff into /velux (see SearchHome.tsx) — before that,
// /velux had no query-param entry point, so a sitelinks-searchbox action
// would have described behavior the site didn't actually have.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "Velte",
      url: "https://velte.ng",
      logo: "https://velte.ng/velte_manifest.png",
      sameAs: [
        "https://web.facebook.com/velte.ng",
        "https://www.instagram.com/veltetechnologies/",
      ],
    },
    {
      "@type": "WebSite",
      name: "Velte",
      url: "https://velte.ng",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://velte.ng/velux?q={search_term_string}&auto=1",
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default async function HomePage() {
  // Best-effort, fetched in parallel — a backend hiccup shouldn't take the
  // whole marketing homepage down with it; both sections render nothing
  // when their list is empty, so this degrades to the pre-2026-08-05 page.
  const [marketplaceItems, vendorItems] = await Promise.all([
    getMarketplacePreview().catch(() => []),
    getVendorsPreview().catch(() => []),
  ]);

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <StandaloneHomeRedirect />
      <Navbar />
      <Hero />
      <WaysToHelp />
      <MarketplacePreview items={marketplaceItems} />
      <VeluxShowcase />
      <RequestShowcase />
      <VendorsPreview items={vendorItems} />
      <RegisterCta />
      <FAQ />
      <Footer />
    </div>
  );
}
