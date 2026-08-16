"use client";

import { motion } from "motion/react";
// The real WhatsApp brand mark, not a generic chat-bubble glyph (lucide has
// no brand icons at all — this is the one place on the landing page that
// needed one, so it's the one place pulling WhatsappLogo in specifically,
// rather than changing the shared WhatsAppButton used elsewhere in the app,
// which was out of scope here).
import { WhatsappLogo } from "@phosphor-icons/react";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// A single, focused strip — the whole point is one sentence ("you end up on
// WhatsApp, talking to a real person, not stuck in an app"), not a feature
// card competing for attention with everything around it.
export function WhatsAppHighlight() {
  return (
    <section className="relative bg-white border-t border-gray-100 py-10 sm:py-12">
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        variants={fadeUp}
        className="max-w-2xl mx-auto px-5 sm:px-8 text-center"
      >
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-green-500 mb-4">
          <WhatsappLogo size={24} weight="fill" className="text-white" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#023337] tracking-tight mb-2 text-balance">
          Chat directly on WhatsApp
        </h2>
        <p className="text-gray-500 max-w-md mx-auto">
          Once Velte connects you, you&apos;re talking straight to the business
          — no in-app messaging, no waiting on a support queue.
        </p>
      </motion.div>
    </section>
  );
}
