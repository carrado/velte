import type { FaqItem } from "@/types/common";

export const faqs: FaqItem[] = [
  {
    category: "buyer",
    featured: true,
    question: "What is Velte?",
    answer:
      "Velte is where you find real vendors nearby — browse what's listed, describe what you need to Velux (our AI), or post a request and let vendors respond to you. Every result comes from a real business's real inventory, never invented.",
  },
  {
    category: "buyer",
    featured: true,
    question: "How does Velux work?",
    answer:
      "You can browse real vendor listings directly on our homepage, or describe what you need in your own words, or upload a photo. Velux reads the request the way a person would, then matches it against real vendor inventory nearby — ranked by meaning and distance.",
  },
  {
    category: "buyer",
    featured: true,
    question: "Can I post a request?",
    answer:
      "Yes — if you can't find something listed, describe what you need once and every nearby vendor who actually has it gets notified. You'll hear back directly from them, no reposting or re-searching required.",
  },
  {
    category: "buyer",
    featured: true,
    question: "How do vendor responses work?",
    answer:
      "When a vendor responds to your request, we notify you in-app, by push notification, and by SMS — so you'll know even if you're not on the site. Tap through to see their offer and chat with them directly.",
  },
  {
    category: "buyer",
    featured: true,
    question: "How does Velte use my phone number?",
    answer:
      "Only for verification (a one-time code) and notifications about your own activity — like a vendor responding to your request. It's never shared or sold, and there's no marketing spam.",
  },
  {
    category: "buyer",
    question: "Can I just browse instead of searching?",
    answer:
      "Yes — our homepage shows real listings from real vendors, ready to chat about right away. AI search is there whenever you want something more specific than what's shown.",
  },
  {
    category: "buyer",
    question: "Is it free to search?",
    answer:
      "Yes. Browsing, searching, and messaging vendors on Velte costs you nothing, whether you find a match or not.",
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
    category: "buyer",
    featured: true,
    question: "How do I actually contact a vendor I find?",
    answer:
      "Every match hands you straight into a WhatsApp chat with the vendor — no in-app messaging, no waiting on a callback. You're talking to the real business directly, the same way you would if a friend gave you their number.",
  },
  {
    category: "buyer",
    question: "Can I negotiate the price?",
    answer:
      "That's between you and the vendor once you're chatting — Velte shows you the real listed price, but bargaining happens the way it always has, person to person on WhatsApp.",
  },
  {
    category: "buyer",
    question: "Where does Velte currently work?",
    answer:
      "We're live across Anambra, Enugu and Imo as our pilot region. Search still works outside that area — you'll just find fewer vendors until we expand.",
  },
  {
    category: "buyer",
    question: "Do I need an account to search?",
    answer:
      "No — searching is open to anyone, no sign-up required. Just describe what you need or send a photo and start browsing matches straight away.",
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
      "There's no ad spend or bidding for placement — matching itself is free. Your wallet does need to hold at least ₦500 (the cost of a single lead) to stay eligible to appear in search; if it drains, top up to come back into results.",
  },
  {
    category: "vendor",
    question: "What if I haven't uploaded my full catalogue?",
    answer:
      "Your store profile alone is enough to be discoverable. Vendors who list individual products rank higher for specific searches, but an unlisted shop still shows up.",
  },
  {
    category: "vendor",
    question: "What happens if my wallet runs low?",
    answer:
      "You'll get a low-balance notice before you're dropped from results, so you can top up without losing visibility. Your store and listings stay exactly as they are — only new leads pause until you top up.",
  },
  {
    category: "vendor",
    question: "Can I update my store or products later?",
    answer:
      "Yes — edit your store profile, products and prices anytime from your dashboard. Changes show up in buyer search right away, no review or delay.",
  },
  {
    category: "vendor",
    question: "How is trust built for a new vendor?",
    answer:
      "It builds from real activity on the platform — verified details, staying responsive, and completed orders over time. A brand-new store still shows up in search from day one; trust affects ranking, not whether you're found.",
  },
];

export const featuredFaqs = faqs.filter((faq) => faq.featured);

// The homepage's own curated set (landing/FAQ.tsx) — trimmed to 5 on
// 2026-08-15 (was showing every buyer-featured question, which made the FAQ
// section run long relative to the rest of the now-compact page). In the
// order a first-time buyer would actually ask them: what is this → how does
// the AI part work → can I ask for something specific → what happens after
// → what's the phone number actually for (SMS is now a real part of the
// product, see buyerNotification.service.js's SMS_TYPES — this question
// earns its place here). Deliberately excludes every vendor-category
// question — the buyer homepage's own FAQ shouldn't be answering "how do I
// get discovered by buyers," that belongs on a vendor landing page instead
// (see VendorPitch.tsx's own 2026-08-13 de-emphasis note).
export const homepageFaqs = [
  "What is Velte?",
  "How does Velux work?",
  "Can I post a request?",
  "How do vendor responses work?",
  "How does Velte use my phone number?",
]
  .map((q) => faqs.find((f) => f.question === q))
  .filter((f): f is FaqItem => !!f);
