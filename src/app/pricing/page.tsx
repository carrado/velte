"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { Check, Minus, Sparkles } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import PricingCards from "@/components/landing/PricingCards";
import type { PricingComparisonRow, PricingFaq } from "@/types/pricing";

const comparison: PricingComparisonRow[] = [
  { feature: "WhatsApp Business number", basic: "1", pro: "1" },
  { feature: "24/7 AI sales conversations", basic: true, pro: true },
  { feature: "Smart price negotiation", basic: true, pro: true },
  { feature: "Real-time inventory sync", basic: true, pro: true },
  { feature: "Instant payment links", basic: true, pro: true },
  { feature: "Order management & tracking", basic: true, pro: true },
  { feature: "Sales analytics dashboard", basic: true, pro: true },
  {
    feature: "AI ad generation (copy & creatives)",
    basic: false,
    pro: true,
    highlight: true,
  },
  {
    feature: "AI ad posting assistance",
    basic: false,
    pro: true,
    highlight: true,
  },
  {
    feature: "AI campaign recommendations",
    basic: false,
    pro: true,
    highlight: true,
  },
  {
    feature: "Multi-channel ad scheduling",
    basic: false,
    pro: true,
    highlight: true,
  },
  { feature: "Support", basic: "Email", pro: "Priority" },
];

const faqs: PricingFaq[] = [
  {
    q: "What's the difference between Basic and Pro?",
    a: "Basic gives you a full AI sales agent that answers questions, negotiates, checks stock and sends payment links on WhatsApp. Pro adds AI ad generation and ad-posting assistance, so the same AI also creates your ad copy and creatives and helps you publish them.",
  },
  {
    q: "Can I upgrade or downgrade later?",
    a: "Yes. You can switch between Basic and Pro at any time from your dashboard — changes take effect on your next billing cycle.",
  },
  {
    q: "Is there a free trial?",
    a: "Every plan starts with a 7-day free trial. No card required to begin.",
  },
  {
    q: "What does “ad posting assistance” actually do?",
    a: "Pro's AI drafts ad copy and visuals tailored to your products, recommends the right campaigns, and helps you schedule and publish them across your channels — so your marketing runs right alongside your sales.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Absolutely. There are no long-term contracts — cancel whenever you like.",
  },
];

function Cell({ value }: { value: boolean | string }) {
  if (value === true)
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[rgb(247,107,16)]/15">
        <Check className="h-3.5 w-3.5 text-[rgb(247,107,16)]" />
      </span>
    );
  if (value === false) return <Minus className="h-4 w-4 text-white/20" />;
  return <span className="text-sm font-medium text-white/80">{value}</span>;
}

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main className="bg-[#050d08] min-h-screen pt-28 pb-24">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(247,107,16,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(247,107,16,0.4) 1px, transparent 1px)`,
              backgroundSize: "64px 64px",
            }}
          />
          <div className="absolute top-0 left-1/3 w-[480px] h-[480px] bg-[rgb(247,107,16)]/[0.08] rounded-full blur-[120px] pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-5 sm:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 bg-[rgb(247,107,16)]/[0.1] border border-[rgb(247,107,16)]/[0.2] text-[rgb(247,107,16)] text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6 tracking-wide">
                <Sparkles className="w-3.5 h-3.5" />
                Simple, honest pricing
              </span>
              <h1 className="text-4xl lg:text-6xl font-bold text-white tracking-tight mb-6 text-balance">
                Pick the plan that
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[rgb(247,107,16)] via-[rgb(255,140,50)] to-[rgb(255,180,90)]">
                  sells for you
                </span>
              </h1>
              <p className="text-lg text-white/55 max-w-2xl mx-auto leading-relaxed">
                Both plans come with a 7-day free trial and the full Velte AI
                sales agent. Upgrade to Pro when you&apos;re ready to let AI run
                your ads too. Switch to annual billing to save 20%.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Plan cards */}
        <section className="max-w-7xl mx-auto px-5 sm:px-8 mt-16">
          <PricingCards />
        </section>

        {/* Comparison table */}
        <section className="max-w-4xl mx-auto px-5 sm:px-8 mt-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <span className="inline-block text-xs font-semibold tracking-widest text-[rgb(247,107,16)] uppercase mb-3">
              Full comparison
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
              Basic vs Pro, side by side
            </h2>
          </motion.div>

          <div className="overflow-hidden rounded-2xl border border-white/10">
            {/* Head */}
            <div className="grid grid-cols-[1.6fr_1fr_1fr] bg-white/[0.03] border-b border-white/10">
              <div className="px-5 py-4 text-xs font-semibold uppercase tracking-widest text-white/40">
                Features
              </div>
              <div className="px-3 py-4 text-center text-sm font-semibold text-white">
                Basic
              </div>
              <div className="px-3 py-4 text-center text-sm font-semibold text-[rgb(247,107,16)] bg-[rgb(247,107,16)]/[0.07]">
                Pro
              </div>
            </div>

            {/* Rows */}
            {comparison.map((row, i) => (
              <div
                key={row.feature}
                className={`grid grid-cols-[1.6fr_1fr_1fr] items-center ${
                  i % 2 === 1 ? "bg-white/[0.015]" : ""
                }`}
              >
                <div className="px-5 py-3.5 flex items-center gap-2">
                  <span className="text-sm text-white/70">{row.feature}</span>
                  {row.highlight && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(247,107,16)] bg-[rgb(247,107,16)]/10 px-1.5 py-0.5 rounded">
                      Pro
                    </span>
                  )}
                </div>
                <div className="px-3 py-3.5 flex justify-center">
                  <Cell value={row.basic} />
                </div>
                <div className="px-3 py-3.5 flex justify-center bg-[rgb(247,107,16)]/[0.05]">
                  <Cell value={row.pro} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-5 sm:px-8 mt-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <span className="inline-block text-xs font-semibold tracking-widest text-[rgb(247,107,16)] uppercase mb-3">
              Questions
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
              Frequently asked
            </h2>
          </motion.div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={faq.q}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-5"
              >
                <h3 className="text-white font-semibold mb-1.5">{faq.q}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-7xl mx-auto px-5 sm:px-8 mt-28">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-br from-[rgb(247,107,16)]/[0.1] to-transparent border border-[rgb(247,107,16)]/20 rounded-3xl p-10 sm:p-14 text-center"
          >
            <h3 className="text-3xl lg:text-4xl font-bold text-white mb-4 text-balance">
              Start free. Upgrade when you&apos;re ready.
            </h3>
            <p className="text-white/60 mb-8 max-w-xl mx-auto">
              Get your AI sales agent live in minutes — no credit card required.
            </p>
            <Link
              href="/auth/signup"
              className="inline-block bg-[rgb(247,107,16)] hover:bg-[rgb(247,107,16)]/90 text-white font-semibold px-8 py-3.5 rounded-lg shadow-lg shadow-[rgba(247,107,16,0.25)] transition-colors"
            >
              Start Your Free Trial
            </Link>
          </motion.div>
        </section>
      </main>
      <Footer />
    </>
  );
}
