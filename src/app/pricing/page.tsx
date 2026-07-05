"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import PricingCards from "@/components/landing/PricingCards";

const faqs = [
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
                Pay for results, not seats
              </span>
              <h1 className="text-4xl lg:text-6xl font-bold text-white tracking-tight mb-6 text-balance">
                No subscription.
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[rgb(247,107,16)] via-[rgb(255,140,50)] to-[rgb(255,180,90)]">
                  Pay per lead.
                </span>
              </h1>
              <p className="text-lg text-white/55 max-w-2xl mx-auto leading-relaxed">
                List your products for free. Buyers searching nearby find you by
                meaning, distance and trust — you only pay when we send you a
                real lead.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Placeholder pricing card */}
        <section className="max-w-7xl mx-auto px-5 sm:px-8 mt-16">
          <PricingCards />
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
              List your products for free.
            </h3>
            <p className="text-white/60 mb-8 max-w-xl mx-auto">
              Get discovered by nearby buyers — no credit card required to
              start.
            </p>
            <Link
              href="/auth/signup"
              className="inline-block bg-[rgb(247,107,16)] hover:bg-[rgb(247,107,16)]/90 text-white font-semibold px-8 py-3.5 rounded-lg shadow-lg shadow-[rgba(247,107,16,0.25)] transition-colors"
            >
              Get Early Access
            </Link>
          </motion.div>
        </section>
      </main>
      <Footer />
    </>
  );
}
