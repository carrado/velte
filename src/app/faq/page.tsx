import type { Metadata } from "next";
import { faqs } from "@/lib/faqs";
import FaqContent from "./_components/FaqContent";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Everything buyers and vendors ask before they get started on Velte — searching, contacting a vendor, listing a business, and more.",
  alternates: {
    canonical: "/faq",
  },
  openGraph: {
    title: "Velte FAQ",
    description:
      "Everything buyers and vendors ask before they get started on Velte.",
    url: "/faq",
  },
};

// FAQPage structured data — eligible for Google's FAQ rich result, built
// straight from the same list FaqContent renders (never a second, separate
// copy of the copy that could drift from what's actually on the page).
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

export default function FaqPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <FaqContent />
    </>
  );
}
