import type { FaqItem } from "@/types/common";

export const faqs: FaqItem[] = [
  {
    category: "buyer",
    featured: true,
    question: "How does Velte find what I'm looking for?",
    answer:
      "Describe what you need in your own words, or upload a photo. Our AI reads the request the way a person would, then matches it against real vendor inventory nearby — ranked by meaning and distance.",
  },
  {
    category: "buyer",
    question: "Is it free to search?",
    answer:
      "Yes. Searching and messaging vendors on Velte costs you nothing, whether you find a match or not.",
  },
  {
    category: "buyer",
    question: "What if no vendor has what I need?",
    answer:
      "We tell you honestly rather than showing you something close enough. Your search is logged as demand, and we may point you to a nearby physical market where it's more likely to turn up.",
  },
  {
    category: "buyer",
    question: "Can I search with a photo, not just text?",
    answer:
      "Yes — snap or upload a photo of what you're after and the AI will identify it and match it the same way it would a text description.",
  },
  {
    category: "vendor",
    featured: true,
    question: "How do I get discovered by buyers?",
    answer:
      "List your business — even just your store profile — and buyers searching nearby are matched to you automatically, by meaning, distance and trust. No ads, no bidding for placement.",
  },
  {
    category: "vendor",
    question: "Is it free to list my business?",
    answer:
      "Yes, listing is free. There's no subscription or listing fee to appear in buyer searches.",
  },
  {
    category: "vendor",
    featured: true,
    question: "Do I have to pay to be found?",
    answer:
      "There's no ad spend or bidding for placement — matching itself is free. Your wallet does need to hold at least ₦400 (the cost of a single lead) to stay eligible to appear in search; if it drains, top up to come back into results.",
  },
  {
    category: "vendor",
    question: "What if I haven't uploaded my full catalogue?",
    answer:
      "Your store profile alone is enough to be discoverable. Vendors who list individual products rank higher for specific searches, but an unlisted shop still shows up.",
  },
];

export const featuredFaqs = faqs.filter((faq) => faq.featured);
