import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import VendorPitch from "@/components/landing/VendorPitch";
import FAQ from "@/components/landing/FAQ";
import Footer from "@/components/landing/Footer";
import StandaloneHomeRedirect from "@/components/StandaloneHomeRedirect";

// Velte's homepage — redesigned for the pivot (replaces the old
// pre-pivot "WhatsApp AI Sales Rep" marketing site that used to live at
// /vendors). The buyer search experience itself lives at /search.
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
// profiles. No SearchAction here: /search is a conversational AI flow with
// no `?q=`-driven entry point, so a sitelinks-searchbox action would
// describe behavior the site doesn't actually have.
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
      <StandaloneHomeRedirect />
      <Navbar />
      <Hero />
      <VendorPitch />
      <FAQ />
      <Footer />
    </div>
  );
}
