import Navbar from "@/components/landing/Navbar";
import { FloatingAskBar } from "@/components/landing/FloatingAskBar";
import Hero from "@/components/landing/Hero";
import { HowItWorksSteps } from "@/components/landing/HowItWorksSteps";
import { RegisterCta } from "@/components/landing/RegisterCta";
import Footer from "@/components/landing/Footer";

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

export default function PublicHomePage() {
  return (
    <div className="min-h-screen bg-canvas">
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
