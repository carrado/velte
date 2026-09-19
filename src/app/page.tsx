import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import { FloatingAskBar } from "@/components/landing/FloatingAskBar";
import Hero from "@/components/landing/Hero";
import { HowItWorksSteps } from "@/components/landing/HowItWorksSteps";
import { RegisterCta } from "@/components/landing/RegisterCta";
import Footer from "@/components/landing/Footer";

// Velte's homepage — redesigned for the pivot (replaces the old
// pre-pivot "WhatsApp AI Sales Rep" marketing site that used to live at
// /vendors). The buyer search experience itself lives at /chat.
//
// SHORT REDESIGN (2026-09-17, explicit request: "no much content, very
// short and well convincing for the users and vendors") — cuts the
// 2026-08-15 full redesign's 9-section middle (VeluxShowcase,
// NoMatchShowcase, AskAnythingScope, MarketplaceComparison,
// WhatsAppHighlight, BuiltForNigeria, FAQ) down to the two pitches that
// actually earn distinct real estate on a first visit, in this order:
// Hero (the buyer ask — the product's own composer, wired live to /chat) →
// HowItWorksSteps (the three-word mental model) → RegisterCta (the vendor
// pitch — the only section that makes a case for LISTING, not just
// searching). FloatingAskBar sits outside this flow entirely (fixed
// positioning, appears once scrolled past Hero) and is what gives a buyer a
// second way to act without a dedicated closing section for it.
//
// FinalAskCta ("Just ask Velte.") removed the same day, per explicit
// follow-up request — Hero's own composer plus FloatingAskBar already cover
// "give the buyer a way to search," and a second, near-identical composer
// right before the vendor pitch was pure repetition rather than a distinct
// pitch of its own. Not deleted, same precedent as the sections above.
//
// Every section kept was already short and already convincing on its own
// terms — this is a subtraction pass, not a rewrite: the removed sections
// were elaborating on a pitch Hero/HowItWorksSteps/RegisterCta already make
// in fewer words, not saying anything those three don't. None of the
// removed files were deleted (same precedent as VendorsPreview's own
// 2026-08-15 removal, still used elsewhere) — only this page stopped
// rendering them.
//
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
      <RegisterCta />
      <Footer />
    </div>
  );
}
