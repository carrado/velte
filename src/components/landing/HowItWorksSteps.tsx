"use client";

import { motion } from "motion/react";
import {
  ArrowRightIcon,
  LinkIcon,
  MessageCircleIcon,
} from "@/components/icons";
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
// The middle step uses Velte's own avatar image (same file as the /chat
// page's assistant avatar) instead of an icon — "Velte understands" is
// literally Velte doing the understanding, so the real persona reads better
// there than an abstract sparkle glyph.
const steps: {
  icon?: typeof MessageCircleIcon;
  image?: string;
  label: string;
}[] = [
  { icon: MessageCircleIcon, label: "Tell Velte" },
  { image: "/velte_ai_assistant.png", label: "Velte understands" },
  { icon: LinkIcon, label: "Get connected" },
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
            {steps.map(({ icon: Icon, image, label }, i) => (
              <motion.div
                key={label}
                variants={fadeUp}
                className="flex items-center gap-2 sm:gap-4"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-orange-50 flex items-center justify-center overflow-hidden">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image}
                        alt="Velte"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      Icon && <Icon size={22} className="text-orange-500" />
                    )}
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">
                    {label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <ArrowRightIcon
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
