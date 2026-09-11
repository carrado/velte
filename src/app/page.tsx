import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import { FloatingAskBar } from "@/components/landing/FloatingAskBar";
import Hero from "@/components/landing/Hero";
import { HowItWorksSteps } from "@/components/landing/HowItWorksSteps";
import { VeluxShowcase } from "@/components/landing/VeluxShowcase";
import { NoMatchShowcase } from "@/components/landing/NoMatchShowcase";
import { AskAnythingScope } from "@/components/landing/AskAnythingScope";
import { MarketplaceComparison } from "@/components/landing/MarketplaceComparison";
import { WhatsAppHighlight } from "@/components/landing/WhatsAppHighlight";
import { BuiltForNigeria } from "@/components/landing/BuiltForNigeria";
import { FinalAskCta } from "@/components/landing/FinalAskCta";
import { RegisterCta } from "@/components/landing/RegisterCta";
import FAQ from "@/components/landing/FAQ";
import Footer from "@/components/landing/Footer";

// Velte's homepage — redesigned for the pivot (replaces the old
// pre-pivot "WhatsApp AI Sales Rep" marketing site that used to live at
// /vendors). The buyer search experience itself lives at /chat.
//
// Full redesign 2026-08-15 (second pass, same day) — the whole page now
// tells one story end to end, in this order: Hero (the ask) →
// HowItWorksSteps (the mental model, three words) → VeluxShowcase (seeing
// it actually work) → NoMatchShowcase (what happens when nothing matches
// yet — corrected, see that file's own comment, to show Velte OFFERING to
// help rather than a "Post a Request" button) → AskAnythingScope (breadth:
// products/services/businesses/anything else) → MarketplaceComparison (the
// explicit old-way-vs-new-way pitch) → WhatsAppHighlight + BuiltForNigeria
// (two short trust strips) → FinalAskCta (a second, unmissable chance to
// act) → RegisterCta (the account pitch, kept but pushed below everything
// else — see that file's own comment) → FAQ → Footer. FloatingAskBar sits
// outside this flow entirely (fixed positioning, appears once scrolled past
// Hero) so a visitor can start a conversation from anywhere on the page,
// not just the first screen. Navbar simplified alongside this pass — see
// its own comment.
//
// VendorsPreview ("Find businesses you can actually talk to") was briefly
// back in this composition the same day, then pulled again — it was
// re-introduced as a "real supply, not vaporware" proof section, but with
// NoMatchShowcase already showing a real business example inline (ABC
// Catering) and BuiltForNigeria already covering trust, a third proof
// section that's ALSO a browse-a-grid affordance stopped earning its place;
// it just re-introduced the exact pattern the rest of this redesign moves
// away from. The component file/export and its VendorCard/SlidingCover
// pieces stay untouched (still used by /marketplace and SimilarVendors) —
// only this page stopped rendering the section again.
//
// Kept from the earlier trims: Hero's own composer stays the visually
// dominant element on the first screen (now with a "Your AI shopping
// agent" eyebrow above it — see Hero.tsx), and the supply numbers (42
// products, 25 vendors) still never appear anywhere on this page as a
// headline — BuiltForNigeria sells real-and-growing, not a number that
// reads small today and would need rewriting constantly as it changes.
// Title/description tightened 2026-08-2x for SEO — "Find anything nearby"
// alone told Google nothing about WHAT kind of site this is (map app? food
// delivery? e-commerce?), and gave search algorithms nothing to anchor on
// against "VULTe" (vulte.ng), Polaris Bank's much larger, heavily-searched
// digital banking platform — phonetically/alphabetically close enough that
// a typo'd or ambiguous search risks an autocorrect toward the bank
// instead. Naming "marketplace"/"vendors"/"shopping"/"Nigeria" explicitly
// here (and in layout.tsx's own site-wide default, kept in sync) signals
// the retail/directory category plainly, on top of being genuinely more
// specific/descriptive on its own merits.
export const metadata: Metadata = {
  title: "Velte | AI Shopping Assistant & Local Vendor Marketplace Nigeria",
  description:
    "Describe what you need and Velte's AI instantly matches you with real, nearby vendors across Nigeria — products, food, and services. Chat directly with them and get it sorted.",
  alternates: {
    canonical: "/",
  },
};

// Organization + WebSite structured data — helps Google associate the site
// with the Velte brand (knowledge panel eligibility) and its real social
// profiles. A SearchAction was added 2026-08-13 alongside Hero's own real
// `?q=`/`auto=1` handoff into /chat (see SearchHome.tsx) — before that,
// /chat had no query-param entry point, so a sitelinks-searchbox action
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
          urlTemplate: "https://velte.ng/chat?q={search_term_string}&auto=1",
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <FloatingAskBar />
      <Hero />
      <HowItWorksSteps />
      <VeluxShowcase />
      <NoMatchShowcase />
      <AskAnythingScope />
      <MarketplaceComparison />
      <WhatsAppHighlight />
      <BuiltForNigeria />
      <FinalAskCta />
      <RegisterCta />
      <FAQ />
      <Footer />
    </div>
  );
}
