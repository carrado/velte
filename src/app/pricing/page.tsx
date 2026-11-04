import { Suspense } from "react";
import type { Metadata } from "next";
import type { PricingFaqItem } from "@/types/common";
import PricingContent from "./_components/PricingContent";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Buyer Free and Premium, Vendor Basic and Enterprise — clear plans for shopping with Velte’s AI agent or growing your store.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "Velte Pricing — plans for buyers and vendors",
    description:
      "Free AI shopping for buyers, Premium for requests and Hub tools. Vendors list free and pay per real lead — or go Enterprise with no lead fee.",
    url: "/pricing",
  },
};

const faqs: PricingFaqItem[] = [
  {
    q: "Can I change my plan later?",
    a: "Yes. Buyers can upgrade to Premium anytime from Velte. Vendors can start on Basic (pay per lead) and move to Enterprise when they want the lead fee waived and Hub perks included.",
  },
  {
    q: "How do credits and photo search work for buyers?",
    a: "Free registered buyers receive 20 free credits every day and 1 photo search per day. Premium buyers enjoy unlimited credits for shopping, up to 5 photo searches per day, buyer requests to vendors, and full access to Hub tools.",
  },
  {
    q: "How much does a vendor lead cost?",
    a: "Basic vendors pay a flat ₦1,000 per matched lead delivered to their store. Enterprise vendors don’t pay that lead fee and get direct WhatsApp handoff to chat with buyers.",
  },
  {
    q: "Is there a free trial?",
    a: "You can start on Velte completely for free without a credit card. Buyers receive 20 free credits every day on the Free plan, and vendors can list their store and products for free on the Basic plan.",
  },
  {
    q: "How do I pay?",
    a: "Subscriptions and wallet top-ups are charged through Paystack (card). Vendors can also fund credit packs from their Velte wallet.",
  },
  {
    q: "Do you offer refunds?",
    a: "Lead fees and credit spends for completed work aren’t refundable. If a charge looks wrong, contact support and we’ll review it.",
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
      <Suspense fallback={null}>
        <PricingContent faqs={faqs} />
      </Suspense>
    </>
  );
}
