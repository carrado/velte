import type { Metadata } from "next";
import type { PricingFaqItem } from "@/types/common";
import PricingContent from "./_components/PricingContent";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "No subscription, no listing fee. List your products for free on Velte and only pay when we send you a real, matched lead.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "Velte Pricing — pay per lead, not a subscription",
    description:
      "List your products for free on Velte and only pay when we send you a real, matched lead.",
    url: "/pricing",
  },
};

const faqs: PricingFaqItem[] = [
  {
    q: "Is there a subscription?",
    a: "No. There's no monthly fee to list your products or appear in buyer searches. You only pay when we send you a real, matched lead.",
  },
  {
    q: "How much does a lead cost?",
    a: "We're finalising exact pricing as Velte rolls out. It'll be a small, predictable cost per lead — never a surprise charge.",
  },
  {
    q: "What counts as a lead?",
    a: "A buyer who searched for something you sell, matched to your listing by meaning, distance and trust, and chose to chat with you.",
  },
  {
    q: "Can I control how much I spend?",
    a: "Yes — leads are billed from a prepaid wallet you top up yourself, so you always know your spend and can top up on your terms.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.a,
    },
  })),
};

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <PricingContent faqs={faqs} />
    </>
  );
}
