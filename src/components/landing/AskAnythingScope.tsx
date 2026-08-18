"use client";

import { motion } from "motion/react";
import {
  HelpCircleIcon,
  PackageIcon,
  StoreIcon,
  WrenchIcon,
} from "@/components/icons";
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// Establishes breadth (2026-08-15, full homepage redesign) — names the
// four kinds of things Velte's search already spans today
// (a specific product AND a service both go through searchProducts; a kind
// of business goes through searchStores; anything neither can answer is
// where createBuyerRequest picks up — see systemPrompt.ts) — a plain
// four-item row, not four cards, since none of these need more than a
// label to land the point.
const scope = [
  { icon: PackageIcon, label: "Products" },
  { icon: WrenchIcon, label: "Services" },
  { icon: StoreIcon, label: "Businesses" },
  { icon: HelpCircleIcon, label: "Anything else" },
];

export function AskAnythingScope() {
  return (
    <section className="relative bg-white border-t border-gray-100 py-10 sm:py-12">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          variants={stagger}
        >
          <motion.p
            variants={fadeUp}
            className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-5"
          >
            Ask for anything
          </motion.p>
          <motion.div
            variants={stagger}
            className="flex flex-wrap items-center justify-center gap-3 sm:gap-4"
          >
            {scope.map(({ icon: Icon, label }) => (
              <motion.div
                key={label}
                variants={fadeUp}
                className="inline-flex items-center gap-2 bg-[#F1F5F9] rounded-full px-4 py-2"
              >
                <Icon size={17} className="text-orange-500 shrink-0" />
                <span className="text-sm font-semibold text-gray-700">
                  {label}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
