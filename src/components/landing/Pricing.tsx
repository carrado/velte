"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import PricingCards from "./PricingCards";

export default function Pricing() {
  return (
    <section id="pricing" className="bg-white py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-xs font-semibold tracking-widest text-[rgb(247,107,16)] uppercase mb-4">
            Transparent pricing
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-950 tracking-tight mb-5 text-balance">
            Two plans. Zero guesswork.
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Start free for 7 days. Pick{" "}
            <span className="font-semibold text-gray-700">Basic</span> to let AI
            run your WhatsApp sales — or go{" "}
            <span className="font-semibold text-gray-700">Pro</span> and have AI
            create and post your ads too.
          </p>
        </motion.div>

        {/* Cards */}
        <PricingCards theme="light" />

        {/* Link to full pricing page */}
        <div className="text-center mt-10">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 text-[rgb(247,107,16)] font-semibold text-sm hover:gap-2.5 transition-all"
          >
            Compare all features
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
