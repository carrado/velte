"use client";

import { motion } from "motion/react";
import { ArrowRightIcon, CheckIcon, CloseIcon } from "@/components/icons";
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const traditionalSteps = [
  "Browse categories",
  "Apply filters",
  "Compare listings yourself",
  "Hope the right vendor shows up",
];

const velteSteps = [
  "Tell Velte what you need",
  "Velte understands your request",
  "Velte finds and compares for you",
  "You connect directly, on WhatsApp",
];

// The explicit "old way vs new way" pitch (2026-08-15, full homepage
// redesign) — everything above this section already SHOWS the difference
// (the composer, the conversation demo, the no-match fallback); this is the
// one place that just SAYS it plainly, for a visitor skimming rather than
// reading every section closely.
export function MarketplaceComparison() {
  return (
    <section className="relative bg-[#023337] py-14 sm:py-16 overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -left-20 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-14 w-56 h-56 bg-orange-500/[0.07] rounded-full blur-3xl" />

      <div className="relative max-w-3xl mx-auto px-5 sm:px-8">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="text-center mb-10"
        >
          <motion.h2
            variants={fadeUp}
            className="text-2xl sm:text-3xl font-bold text-white tracking-tight text-balance"
          >
            Stop searching. Start asking.
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="grid sm:grid-cols-2 gap-5"
        >
          <motion.div
            variants={fadeUp}
            className="bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wide mb-4">
              Traditional marketplace
            </p>
            <div className="space-y-3">
              {traditionalSteps.map((step) => (
                <div key={step} className="flex items-start gap-2.5">
                  <CloseIcon
                    size={14}
                    className="text-white/25 shrink-0 mt-0.5"
                  />
                  <span className="text-[13px] text-white/50 leading-snug">
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="bg-orange-500/10 border border-orange-500/25 rounded-2xl p-6"
          >
            <p className="text-orange-300 text-xs font-semibold uppercase tracking-wide mb-4 flex items-center gap-1.5">
              Velte
              <ArrowRightIcon size={11} />
            </p>
            <div className="space-y-3">
              {velteSteps.map((step) => (
                <div key={step} className="flex items-start gap-2.5">
                  <CheckIcon
                    size={14}
                    className="text-orange-400 shrink-0 mt-0.5"
                  />
                  <span className="text-[13px] text-white/85 leading-snug font-medium">
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
