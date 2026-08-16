"use client";

import { motion } from "motion/react";
import { ArrowRight, MessageCircle, Sparkles, Link2 } from "lucide-react";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// The three-step version of "you don't need to search" — deliberately just
// three words and two arrows, no paragraph explaining the pipeline
// underneath (that's what VeluxShowcase right below this demonstrates).
// This section's only job is to plant the mental model before the visitor
// sees it in action: Tell → Understand → Connect, not Browse → Filter →
// Vendor.
const steps = [
  { icon: MessageCircle, label: "Tell Velte" },
  { icon: Sparkles, label: "Velte understands" },
  { icon: Link2, label: "Get connected" },
];

export function HowItWorksSteps() {
  return (
    <section className="relative bg-white border-t border-gray-100 py-12 sm:py-14">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          variants={stagger}
        >
          <motion.h2
            variants={fadeUp}
            className="text-xl sm:text-2xl font-bold text-[#023337] tracking-tight mb-8 text-balance"
          >
            You don&apos;t need to search. You just need to ask.
          </motion.h2>

          <motion.div
            variants={stagger}
            className="flex items-center justify-center gap-2 sm:gap-4"
          >
            {steps.map(({ icon: Icon, label }, i) => (
              <motion.div
                key={label}
                variants={fadeUp}
                className="flex items-center gap-2 sm:gap-4"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-orange-50 flex items-center justify-center">
                    <Icon size={18} className="text-orange-500" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">
                    {label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <ArrowRight
                    size={16}
                    className="text-gray-300 shrink-0 mb-6"
                  />
                )}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
