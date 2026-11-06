"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Camera,
  Sparkles,
  MessageCircle,
  CheckCircle2,
  ShieldCheck,
  Store,
  Users,
  Wallet,
  ArrowRight,
  Clock,
  MapPin,
  TrendingUp,
  Zap,
  Check,
  X,
  ShoppingBag,
  Bot,
  HelpCircle,
  ExternalLink,
} from "lucide-react";

import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import FaqAccordionItem from "@/components/landing/FaqAccordionItem";
import { cn } from "@/lib/utils";
import type { FaqItem } from "@/types/common";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

type JourneyKey = "buyer" | "vendor";

interface StepData {
  number: string;
  badge: string;
  title: string;
  headline: string;
  description: string;
  highlights: string[];
  mockupType:
    | "search"
    | "matching"
    | "chat"
    | "storefront"
    | "requests"
    | "roi";
}

const BUYER_STEPS: StepData[] = [
  {
    number: "01",
    badge: "Step 1 • Instant Search",
    title: "Describe what you need",
    headline: "Speak in plain words or snap a photo",
    description:
      "Type naturally using Nigerian everyday terminology or upload a picture of any gadget, car part, fashion item, or groceries. Velte's shopping AI understands context, specs, and budget constraints without keyword gymnastics.",
    highlights: [
      "Works with text queries, voice descriptions, or camera photos",
      "Understands Nigerian slang, landmarks, and market terms",
      "100% free to search with daily AI credits",
    ],
    mockupType: "search",
  },
  {
    number: "02",
    badge: "Step 2 • Verified Matching",
    title: "AI matches genuine nearby vendors",
    headline: "Ranked by meaning, proximity & trust",
    description:
      "Velte scans verified stores in your vicinity. We never show dead listings or phantom products. Matches are scored on semantic relevance, inventory freshness, and store trust ratings — so you only get vendors who actually have what you want.",
    highlights: [
      "Physical vendors verified in your city or neighbourhood",
      "Live inventory checks with direct stock confirmation",
      "Zero pay-to-win fake listings — data decides the match",
    ],
    mockupType: "matching",
  },
  {
    number: "03",
    badge: "Step 3 • Direct Connection",
    title: "Chat directly with the vendor",
    headline: "Negotiate, inspect & close with zero middlemen",
    description:
      "Once matched, you connect straight to the merchant with your product specifications already prepared. Agree on pricing, request photos or live videos, and arrange fast same-day dispatch right to your location.",
    highlights: [
      "Direct buyer-to-seller communication without wait times",
      "Zero commission or hidden fees added to your purchase",
      "Direct relationship with the real vendor for repeat orders",
    ],
    mockupType: "chat",
  },
];

const VENDOR_STEPS: StepData[] = [
  {
    number: "01",
    badge: "Step 1 • Zero Barrier Listing",
    title: "List your business for free",
    headline: "Create your storefront in under 3 minutes",
    description:
      "Set up your official business profile, upload your products or services, and set your store location. There are zero listing fees, zero setup costs, and no monthly software paywall to appear in buyer searches.",
    highlights: [
      "Free forever to list products, menus, or services",
      "Clean, shareable storefront URL for your business",
      "Instant live messaging for incoming customer orders",
    ],
    mockupType: "storefront",
  },
  {
    number: "02",
    badge: "Step 2 • Qualified Demand",
    title: "Receive real buyer requests nearby",
    headline: "Customers actively searching for your catalog",
    description:
      "Stop wasting hard-earned money on blind social media ads. Velte automatically routes buyers in your area directly to your products when they describe what you sell, plus broadcasts requests posted in the Hub.",
    highlights: [
      "High-intent local buyers with budget ready to spend",
      "Instant alerts via SMS and in-app dashboard",
      "Priority matching within your delivery and service radius",
    ],
    mockupType: "requests",
  },
  {
    number: "03",
    badge: "Step 3 • Transparent ROI",
    title: "Chat & close — fair pay-per-lead",
    headline: "You keep 100% of every sale you make",
    description:
      "Respond straight to incoming buyer inquiries and take payments directly. Velte charges a modest prepaid wallet fee (₦1,000 per genuine matched lead, or waived entirely on Enterprise). No revenue cuts, no hidden percentages.",
    highlights: [
      "You keep 100% of the customer's payment",
      "Only pay when a genuine, matched buyer is delivered",
      "Customer contact stays yours forever for repeat business",
    ],
    mockupType: "roi",
  },
];

const COMPARISON_ROWS = [
  {
    feature: "Search Experience",
    traditional: "Scroll through hundreds of cluttered ads and dead links",
    velte: "One natural sentence or photo matched to the right store instantly",
  },
  {
    feature: "Inventory Accuracy",
    traditional:
      "High rate of out-of-stock items, ghost sellers, and bait-and-switch",
    velte: "Active verified vendor catalogs with proximity & trust validation",
  },
  {
    feature: "Communication Channel",
    traditional:
      "Slow website contact forms, hidden emails, or broken DM queues",
    velte:
      "Direct instant chat with the merchant with full query context pre-filled",
  },
  {
    feature: "Platform Commission",
    traditional: "10% to 25% middleman commission marked up onto prices",
    velte: "0% markup on sales — buyer pays real shop price directly to vendor",
  },
  {
    feature: "Vendor Cost Model",
    traditional: "Expensive monthly subscriptions even when zero buyers call",
    velte: "Free to list forever; pay only for actual matched leads delivered",
  },
  {
    feature: "Delivery & Proximity",
    traditional:
      "Nationwide listings without knowing if vendor is down the street",
    velte:
      "Proximity-first matching for fast 45-minute dispatch rider delivery",
  },
];

const HOW_IT_WORKS_FAQS: FaqItem[] = [
  {
    question: "Do I need to download an app or create an account to search?",
    answer:
      "No! As a buyer, you can start searching immediately on Velte without downloading an app or filling long sign-up forms. When you decide to contact a vendor, you connect directly with your search details and specifications already preserved.",
    category: "buyer",
  },
  {
    question: "How does Velte ensure vendors are real and not scammers?",
    answer:
      "Every merchant on Velte undergoes verification including physical store confirmation, phone verification, and trust score metrics. Furthermore, because you connect directly with the vendor, you can request live product photos and videos, verify business credentials, and confirm dispatch timing before paying.",
    category: "buyer",
  },
  {
    question: "How does payment work between buyer and seller?",
    answer:
      "Velte never sits in the middle taking a cut of your transactions. Payments happen directly between you and the vendor through standard local methods: bank transfer, direct payment, or POS on delivery.",
    category: "buyer",
  },
  {
    question: "How does the vendor pay-per-lead model work?",
    answer:
      "Listing your store and products on Velte is completely free. On the Basic vendor tier, you only pay ₦1,000 from your prepaid wallet when a verified, qualified buyer is matched to you and initiates contact. If you upgrade to Enterprise, all lead fees are waived.",
    category: "vendor",
  },
  {
    question: "Can I use Velte both as a buyer and as a vendor?",
    answer:
      "Yes! You can search for products, food, and services anytime as a shopper, and easily register your business to sell goods and services using the same unified platform.",
    category: "buyer",
  },
];

export default function HowItWorksContent() {
  const [active, setActive] = useState<JourneyKey>("buyer");
  const steps = active === "buyer" ? BUYER_STEPS : VENDOR_STEPS;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-canvas pt-20 sm:pt-24 pb-20">
        {/* ── Hero Section ── */}
        <section className="relative overflow-hidden pt-6 pb-12 sm:pt-10 sm:pb-16">
          {/* Animated Ambient Glows */}
          <motion.div
            animate={{
              x: [0, 24, -20, 0],
              y: [0, -16, 12, 0],
              scale: [1, 1.08, 0.95, 1],
            }}
            transition={{
              duration: 16,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-[600px] h-[320px] bg-orange-500/12 rounded-full blur-[120px]"
          />
          <motion.div
            animate={{
              x: [0, -28, 20, 0],
              y: [0, 22, -14, 0],
              scale: [1, 1.1, 0.94, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="pointer-events-none absolute top-40 right-10 w-[300px] h-[300px] bg-amber-500/10 rounded-full blur-[100px]"
          />

          <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
            <div className="text-center max-w-3xl mx-auto">
              {/* Title */}
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-ink text-balance leading-[1.12]"
              >
                How Velte works.
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500">
                  From request to direct deal in seconds.
                </span>
              </motion.h1>

              {/* Dek */}
              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="mt-5 text-base sm:text-lg leading-relaxed text-ink/75 text-balance max-w-2xl mx-auto"
              >
                Whether you&apos;re hunting down a hard-to-find item in your
                neighborhood or growing a business across Nigeria, see exactly
                what happens behind the scenes.
              </motion.p>

              {/* Audience Toggle Tabs */}
              <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.45,
                  delay: 0.18,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="mt-8 flex justify-center"
              >
                <div
                  role="tablist"
                  aria-label="How it works audience"
                  className="inline-flex items-center rounded-2xl border border-gray-200 bg-surface p-1.5 shadow-sm dark:border-white/10"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={active === "buyer"}
                    onClick={() => setActive("buyer")}
                    className={cn(
                      "relative flex items-center justify-center rounded-xl px-5 sm:px-6 py-2.5 text-sm font-bold transition-all cursor-pointer select-none",
                      active === "buyer"
                        ? "text-white"
                        : "text-ink/70 hover:text-ink font-semibold",
                    )}
                  >
                    {active === "buyer" && (
                      <motion.span
                        layoutId="active-journey-tab"
                        transition={{
                          type: "spring",
                          stiffness: 450,
                          damping: 32,
                        }}
                        className="absolute inset-0 rounded-xl bg-orange-500 shadow-md shadow-orange-500/30 z-0"
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2.5">
                      <ShoppingBag
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform duration-200",
                          active === "buyer" ? "text-white" : "text-ink/70",
                        )}
                      />
                      <span>I&apos;m Shopping</span>
                      <span
                        className={cn(
                          "hidden sm:inline text-xs font-normal",
                          active === "buyer" ? "text-white/90" : "text-ink/50",
                        )}
                      >
                        (Buyer Flow)
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={active === "vendor"}
                    onClick={() => setActive("vendor")}
                    className={cn(
                      "relative flex items-center justify-center rounded-xl px-5 sm:px-6 py-2.5 text-sm font-bold transition-all cursor-pointer select-none",
                      active === "vendor"
                        ? "text-white"
                        : "text-ink/70 hover:text-ink font-semibold",
                    )}
                  >
                    {active === "vendor" && (
                      <motion.span
                        layoutId="active-journey-tab"
                        transition={{
                          type: "spring",
                          stiffness: 450,
                          damping: 32,
                        }}
                        className="absolute inset-0 rounded-xl bg-orange-500 shadow-md shadow-orange-500/30 z-0"
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2.5">
                      <Store
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform duration-200",
                          active === "vendor" ? "text-white" : "text-ink/70",
                        )}
                      />
                      <span>I&apos;m Selling</span>
                      <span
                        className={cn(
                          "hidden sm:inline text-xs font-normal",
                          active === "vendor" ? "text-white/90" : "text-ink/50",
                        )}
                      >
                        (Vendor Flow)
                      </span>
                    </span>
                  </button>
                </div>
              </motion.div>

              {/* 3 Core Principles Pills */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 }}
                className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs text-ink/75"
              >
                <motion.span
                  whileHover={{ y: -2, scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-surface border border-gray-200/80 px-3.5 py-1.5 shadow-2xs dark:border-white/10 text-ink font-medium transition-shadow hover:shadow-sm cursor-default"
                >
                  <Zap className="h-3.5 w-3.5 text-orange-500 animate-pulse" />
                  Instant match in seconds
                </motion.span>
                <motion.span
                  whileHover={{ y: -2, scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-surface border border-gray-200/80 px-3.5 py-1.5 shadow-2xs dark:border-white/10 text-ink font-medium transition-shadow hover:shadow-sm cursor-default"
                >
                  <MapPin className="h-3.5 w-3.5 text-orange-500" />
                  Ranked by Meaning + Proximity + Trust
                </motion.span>
                <motion.span
                  whileHover={{ y: -2, scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-surface border border-gray-200/80 px-3.5 py-1.5 shadow-2xs dark:border-white/10 text-ink font-medium transition-shadow hover:shadow-sm cursor-default"
                >
                  <MessageCircle className="h-3.5 w-3.5 text-orange-500" />
                  Direct merchant chat · 0% commission
                </motion.span>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Step-by-Step Interactive Journey ── */}
        <section className="max-w-7xl mx-auto px-5 sm:px-8 py-6 sm:py-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-12 sm:space-y-16"
            >
              {steps.map((step, idx) => {
                const isEven = idx % 2 === 1;
                return (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ y: -4 }}
                    className={cn(
                      "grid gap-8 lg:gap-12 items-center rounded-3xl border border-gray-200/80 bg-surface p-6 sm:p-10 lg:p-12 shadow-sm dark:border-white/10 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/5 hover:border-orange-500/30 group",
                      isEven
                        ? "lg:grid-cols-[1.1fr_0.9fr]"
                        : "lg:grid-cols-[0.9fr_1.1fr]",
                    )}
                  >
                    {/* Left or Right Content Block */}
                    <div className={cn(isEven && "lg:order-2")}>
                      <div className="flex items-center gap-3 mb-4">
                        <motion.span
                          whileHover={{ scale: 1.1, rotate: 3 }}
                          transition={{ type: "spring", stiffness: 400 }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500 font-bold text-white text-sm shadow-sm shadow-orange-500/25 cursor-default select-none"
                        >
                          {step.number}
                        </motion.span>
                        <span className="text-xs font-bold uppercase tracking-wider text-orange-500">
                          {step.badge}
                        </span>
                      </div>

                      <h2 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight text-balance leading-snug">
                        {step.headline}
                      </h2>

                      <p className="mt-3.5 text-sm sm:text-base leading-relaxed text-ink/80">
                        {step.description}
                      </p>

                      <ul className="mt-6 space-y-2.5">
                        {step.highlights.map((item) => (
                          <li
                            key={item}
                            className="flex items-start gap-2.5 text-xs sm:text-sm text-ink font-medium"
                          >
                            <CheckCircle2 className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-8">
                        {active === "buyer" ? (
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="inline-block"
                          >
                            <Link
                              href="/chat"
                              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 transition-colors group/btn"
                            >
                              <span>Try searching on Velte</span>
                              <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                            </Link>
                          </motion.div>
                        ) : (
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="inline-block"
                          >
                            <Link
                              href="/auth/signup"
                              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 transition-colors group/btn"
                            >
                              <span>List your business free</span>
                              <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                            </Link>
                          </motion.div>
                        )}
                      </div>
                    </div>

                    {/* Rich Interactive Mockup Panel */}
                    <div className={cn(isEven && "lg:order-1")}>
                      <MockupCard type={step.mockupType} />
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </section>

        {/* ── Section 3: The Velte Difference Comparison ── */}
        <section className="max-w-7xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-3xl border border-gray-200/80 bg-surface p-6 sm:p-10 lg:p-12 shadow-sm dark:border-white/10 transition-all hover:border-orange-500/25"
          >
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="text-xs font-bold uppercase tracking-widest text-orange-500">
                Why It Works Better
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight mt-2">
                The Velte difference
              </h2>
              <p className="mt-3 text-sm sm:text-base text-ink/75">
                Traditional classifieds and social media DM sales are broken.
                Here is how Velte fixes both sides.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/10">
                    <th className="py-3.5 pr-4 text-xs font-bold uppercase tracking-wider text-ink/60">
                      Feature
                    </th>
                    <th className="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-ink/70 w-1/2">
                      Old Classifieds &amp; Social DMs
                    </th>
                    <th className="py-3.5 pl-4 text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 w-1/2">
                      Velte AI Matching
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {COMPARISON_ROWS.map((row) => (
                    <tr
                      key={row.feature}
                      className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="py-4 pr-4 font-bold text-ink whitespace-nowrap text-xs sm:text-sm">
                        {row.feature}
                      </td>
                      <td className="py-4 px-4 text-xs sm:text-sm text-ink/75 leading-relaxed">
                        <div className="flex items-start gap-2">
                          <X className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                          <span>{row.traditional}</span>
                        </div>
                      </td>
                      <td className="py-4 pl-4 text-xs sm:text-sm text-ink font-medium leading-relaxed bg-orange-50/30 dark:bg-orange-500/5 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                          <span>{row.velte}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </section>

        {/* ── Section 5: Frequently Asked Questions ── */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-16"
        >
          <div className="text-center mb-10">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
              <HelpCircle className="h-5 w-5" />
            </div>
            <h2 className="text-3xl font-extrabold text-ink tracking-tight">
              Frequently asked questions
            </h2>
            <p className="mt-2 text-sm text-ink/70">
              Everything you need to know about navigating the platform.
            </p>
          </div>

          <div className="space-y-3">
            {HOW_IT_WORKS_FAQS.map((faq, i) => (
              <FaqAccordionItem
                key={faq.question}
                faq={faq}
                defaultOpen={i === 0}
              />
            ))}
          </div>
        </motion.section>

        {/* ── Section 6: Dual Pathway Closing CTAs ── */}
        <section className="max-w-7xl mx-auto px-5 sm:px-8 pt-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Shopper CTA Card */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5 }}
              whileHover={{ y: -6, scale: 1.01 }}
              className="relative overflow-hidden rounded-3xl bg-slab p-8 sm:p-10 text-white flex flex-col justify-between shadow-xl transition-shadow hover:shadow-2xl hover:shadow-black/25 group"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 bg-orange-500/20 rounded-full blur-2xl"
              />
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-orange-400 mb-4">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  For Shoppers &amp; Buyers
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Ready to find something nearby?
                </h3>
                <p className="mt-3 text-sm sm:text-base text-white/70 leading-relaxed">
                  Describe what you need in plain words or snap a photo. We will
                  connect you to the nearest verified seller right now.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    href="/chat"
                    className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600 transition-colors group/cta"
                  >
                    <span>Start searching with AI</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-1" />
                  </Link>
                </motion.div>
                <Link
                  href="/marketplace"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white transition-colors"
                >
                  <span>Browse catalog</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </motion.div>

            {/* Vendor CTA Card */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: 0.1 }}
              whileHover={{ y: -6, scale: 1.01 }}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-600 via-orange-500 to-amber-600 p-8 sm:p-10 text-white flex flex-col justify-between shadow-xl shadow-orange-500/15 transition-shadow hover:shadow-2xl hover:shadow-orange-500/25 group"
            >
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.2, 0.1] }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="pointer-events-none absolute -bottom-12 -right-12 w-48 h-48 bg-black/15 rounded-full blur-2xl"
              />
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1 text-xs font-semibold text-white mb-4">
                  <Store className="h-3.5 w-3.5" />
                  For Vendors &amp; Businesses
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Ready to turn searches into sales?
                </h3>
                <p className="mt-3 text-sm sm:text-base text-white/90 leading-relaxed">
                  List your products free forever. Pay only ₦1,000 when a real,
                  verified buyer actually reaches out to your store.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    href="/auth/signup"
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-orange-600 shadow-lg shadow-black/10 hover:bg-orange-50 transition-colors group/cta"
                  >
                    <span>Join as a Vendor</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-1" />
                  </Link>
                </motion.div>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-white/90 hover:text-white transition-colors"
                >
                  <span>View pricing plans</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponents & Interactive Simulated Mockups
// ─────────────────────────────────────────────────────────────────────────────

function MockupCard({ type }: { type: StepData["mockupType"] }) {
  if (type === "search") {
    return (
      <div className="rounded-2xl border border-gray-200 bg-canvas p-4 sm:p-6 shadow-inner dark:border-white/10 transition-all">
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          className="rounded-xl border border-gray-200 bg-surface p-4 shadow-sm dark:border-white/10"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-ink/70 uppercase tracking-wider mb-2.5">
            <Bot className="h-3.5 w-3.5 text-orange-500 animate-pulse" />
            <span>Velte Shopping Assistant</span>
          </div>

          <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3.5 border border-gray-100 dark:border-white/10">
            <p className="text-sm font-semibold text-ink leading-relaxed">
              &ldquo;I need original sneakers size 43 around Ikeja under
              ₦45,000. Black or white color.&rdquo;
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-ink/75">
            <span className="inline-flex items-center gap-1.5 text-orange-600 dark:text-orange-400 font-semibold">
              <Camera className="h-3.5 w-3.5 text-orange-500" />
              Photo search active
            </span>
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Intent recognized
            </span>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/10 flex flex-wrap gap-1.5">
            <motion.span
              whileHover={{ scale: 1.05 }}
              className="rounded-md bg-orange-100/70 dark:bg-orange-500/20 px-2 py-0.5 text-[11px] font-semibold text-orange-800 dark:text-orange-300 cursor-default"
            >
              Category: Footwear
            </motion.span>
            <motion.span
              whileHover={{ scale: 1.05 }}
              className="rounded-md bg-gray-100 dark:bg-white/10 px-2 py-0.5 text-[11px] font-medium text-ink/80 cursor-default"
            >
              Size: 43 EU
            </motion.span>
            <motion.span
              whileHover={{ scale: 1.05 }}
              className="rounded-md bg-gray-100 dark:bg-white/10 px-2 py-0.5 text-[11px] font-medium text-ink/80 cursor-default"
            >
              Location: Ikeja (3km radius)
            </motion.span>
            <motion.span
              whileHover={{ scale: 1.05 }}
              className="rounded-md bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 cursor-default"
            >
              Budget: ≤ ₦45,000
            </motion.span>
          </div>
        </motion.div>
      </div>
    );
  }

  if (type === "matching") {
    return (
      <div className="rounded-2xl border border-gray-200 bg-canvas p-4 sm:p-6 shadow-inner dark:border-white/10 space-y-3">
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          className="rounded-xl border border-orange-500/40 bg-surface p-4 shadow-sm dark:border-orange-500/30 ring-1 ring-orange-500/10"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-ink">
                  Apex Kicks &amp; Apparel
                </span>
                <ShieldCheck className="h-4 w-4 text-orange-500" />
              </div>
              <p className="text-xs text-ink/70 flex items-center gap-1.5 mt-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
                </span>
                Allen Avenue, Ikeja · 1.2 km away
              </p>
            </div>
            <motion.span
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold px-2 py-0.5 border border-emerald-500/20"
            >
              99% Match
            </motion.span>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-lg bg-gray-50 dark:bg-white/5 p-2.5">
            <div>
              <p className="text-xs font-bold text-ink">
                Nike Air Force 1 &apos;07 (White)
              </p>
              <p className="text-[11px] text-ink/70">
                In Stock · Verified Size 43
              </p>
            </div>
            <span className="text-sm font-extrabold text-orange-600 dark:text-orange-400">
              ₦42,000
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-ink/75 pt-2 border-t border-gray-100 dark:border-white/10">
            <span className="inline-flex items-center gap-1 font-medium">
              <Zap className="h-3 w-3 text-orange-500 animate-pulse" />
              Same-day dispatch rider: 25 mins
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              Physical Shop Verified
            </span>
          </div>
        </motion.div>
      </div>
    );
  }

  if (type === "chat") {
    return (
      <div className="rounded-2xl border border-gray-200 bg-canvas p-4 sm:p-6 shadow-inner dark:border-white/10">
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          className="rounded-xl border border-gray-200/90 bg-surface text-ink overflow-hidden shadow-sm dark:border-white/10"
        >
          {/* Chat Header */}
          <div className="bg-gray-50 dark:bg-white/5 px-4 py-3 border-b border-gray-200/80 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                AK
              </div>
              <div>
                <p className="text-xs font-bold leading-tight text-ink">
                  Apex Kicks &amp; Apparel
                </p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium leading-none flex items-center gap-1.5 mt-0.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  Active now · Allen Avenue, Ikeja
                </p>
              </div>
            </div>
            <span className="text-[11px] bg-orange-50 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold px-2.5 py-0.5 rounded-full">
              Direct Vendor Chat
            </span>
          </div>

          {/* Messages */}
          <div className="p-4 space-y-3 text-xs bg-surface">
            {/* Buyer message */}
            <motion.div
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="ml-auto max-w-[85%] rounded-2xl rounded-tr-xs bg-orange-500 p-3 text-white shadow-xs"
            >
              <p className="leading-relaxed">
                Hi! Velte matched me with your shop for the Nike AF1 Size 43.
                Can I inspect on delivery to my address in Ikeja?
              </p>
              <span className="text-[9px] text-white/80 block text-right mt-1 font-medium">
                10:14 AM ✓✓
              </span>
            </motion.div>

            {/* Vendor message */}
            <motion.div
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.2, ease: "easeOut" }}
              className="mr-auto max-w-[85%] rounded-2xl rounded-tl-xs bg-gray-100 dark:bg-white/10 p-3 text-ink shadow-xs border border-gray-200/60 dark:border-white/10"
            >
              <p className="leading-relaxed">
                Good morning! Yes boss, available in stock right now. Our
                dispatch rider can deliver to your doorstep in 25 mins. ₦42,000
                total.
              </p>
              <span className="text-[9px] text-ink/60 block text-right mt-1 font-medium">
                10:15 AM
              </span>
            </motion.div>
          </div>

          {/* Bottom Trust bar */}
          <div className="px-4 py-2 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-white/10 text-[11px] text-ink/75 flex items-center justify-between">
            <span>Direct conversation · No third-party platform markups</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              0% Commission
            </span>
          </div>
        </motion.div>
      </div>
    );
  }

  if (type === "storefront") {
    return (
      <div className="rounded-2xl border border-gray-200 bg-canvas p-4 sm:p-6 shadow-inner dark:border-white/10">
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          className="rounded-xl border border-gray-200 bg-surface p-4 shadow-sm dark:border-white/10"
        >
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/10">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-orange-500 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                VT
              </div>
              <div>
                <p className="text-xs font-bold text-ink">
                  Velte Storefront Active
                </p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  velte.ng/store/your-business
                </p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 border border-emerald-500/20">
              ₦0 Monthly Fee
            </span>
          </div>

          <div className="mt-3.5 grid grid-cols-2 gap-2 text-center">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="rounded-lg bg-gray-50 dark:bg-white/5 p-2.5 transition-colors hover:bg-orange-50/50 dark:hover:bg-orange-500/10 border border-transparent dark:border-white/5"
            >
              <p className="text-[10px] uppercase text-ink/65 font-semibold">
                Active Products
              </p>
              <p className="text-sm font-bold text-ink">48 Listed</p>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="rounded-lg bg-gray-50 dark:bg-white/5 p-2.5 transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-500/10 border border-transparent dark:border-white/5"
            >
              <p className="text-[10px] uppercase text-ink/65 font-semibold">
                Listing Cost
              </p>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                Free Forever
              </p>
            </motion.div>
          </div>

          <p className="mt-3 text-[11px] text-ink/75 text-center">
            Direct buyer order routing enabled · Instant discovery live
          </p>
        </motion.div>
      </div>
    );
  }

  if (type === "requests") {
    return (
      <div className="rounded-2xl border border-gray-200 bg-canvas p-4 sm:p-6 shadow-inner dark:border-white/10">
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          className="rounded-xl border border-orange-500/30 bg-surface p-4 shadow-sm dark:border-white/10"
        >
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="inline-flex items-center gap-1.5 font-bold text-orange-600 dark:text-orange-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
              </span>
              New Buyer Request Matched
            </span>
            <span className="text-[11px] text-ink/60 font-medium">
              Just now
            </span>
          </div>

          <div className="rounded-lg bg-gray-50 dark:bg-white/5 p-3 border border-gray-100 dark:border-white/10">
            <p className="text-xs font-semibold text-ink leading-relaxed">
              &ldquo;Need 2 units of Standing Fan 18-inch with rechargeable
              backup around Ikeja&rdquo;
            </p>
            <div className="mt-2 flex items-center justify-between text-[11px] text-ink/75">
              <span>Matched item: QASA 18&quot; Solar/AC Fan</span>
              <span className="font-bold text-ink">Budget: ₦65,000</span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between pt-2 border-t border-gray-100 dark:border-white/10 text-[11px]">
            <span className="text-ink/70">
              Distance: 1.8km from your warehouse
            </span>
            <motion.span
              whileHover={{ x: 2 }}
              className="font-bold text-orange-600 dark:text-orange-400 inline-flex items-center gap-1 cursor-pointer"
            >
              Claim &amp; Chat Buyer →
            </motion.span>
          </div>
        </motion.div>
      </div>
    );
  }

  if (type === "roi") {
    return (
      <div className="rounded-2xl border border-gray-200 bg-canvas p-4 sm:p-6 shadow-inner dark:border-white/10">
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          className="rounded-xl border border-gray-200 bg-surface p-4 shadow-sm dark:border-white/10"
        >
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/10">
            <span className="text-xs font-bold text-ink">Deal Economics</span>
            <span className="text-[10px] font-bold bg-orange-50 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 px-2 py-0.5 rounded-full">
              Pay-Per-Lead Model
            </span>
          </div>

          <div className="mt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-ink/75">Order closed with buyer:</span>
              <span className="font-bold text-ink">₦130,000</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink/75">Velte match fee:</span>
              <span className="font-semibold text-orange-600 dark:text-orange-400">
                -₦1,000 (flat)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink/75">Platform commission taken:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                ₦0 (0%)
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-white/10 text-sm font-extrabold">
              <span className="text-ink">Net to your bank:</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                ₦129,000 (99.2%)
              </span>
            </div>
          </div>

          <motion.div
            animate={{ scale: [1, 1.015, 1] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            className="mt-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 p-2 text-center text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
          >
            ✓ 130x Return on Lead Investment
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return null;
}
