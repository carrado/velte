"use client";

import Link from "next/link";
import { motion } from "motion/react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { ArrowRightIcon, MapPinBrokenIllustration } from "@/components/icons";

// Next's own catch-all — renders for any unmatched route across the whole
// app, public marketing pages and a mistyped dashboard URL alike, so this
// stays deliberately simple (no auth-aware branching) rather than trying
// to guess which "home" a given visitor meant. Same chrome (Navbar/Footer)
// and visual language every other public page already uses (see
// ContactContent.tsx/RegisterCta.tsx) — a 404 is still a Velte page, not a
// generic error screen bolted on the side.
//
// The CTA leans into the actual product instead of a bare "go home": since
// Velte's whole job is turning "I need X" into a real match, a dead link
// is a good moment to just ask what the visitor was actually looking for,
// not a dead end — see MapPinBrokenIllustration's own comment for why the
// illustration follows the same logic.
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="relative bg-[#F1F5F9] min-h-screen pt-28 pb-24 overflow-hidden">
        <div className="pointer-events-none absolute -top-16 -left-24 w-72 h-72 bg-orange-500/[0.08] rounded-full blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 -right-20 w-80 h-80 bg-orange-500/[0.07] rounded-full blur-3xl" />

        <motion.div
          initial="hidden"
          animate="show"
          variants={stagger}
          className="relative max-w-lg mx-auto px-5 sm:px-8 text-center"
        >
          <motion.div variants={fadeUp} className="flex justify-center mb-2">
            <MapPinBrokenIllustration
              size={168}
              className="drop-shadow-[0_18px_28px_rgba(194,65,12,0.18)]"
            />
          </motion.div>

          <motion.span
            variants={fadeUp}
            className="inline-block text-xs font-semibold tracking-wider text-orange-600 bg-orange-50 border border-orange-100 rounded-full px-3 py-1 mb-5"
          >
            ERROR 404
          </motion.span>

          <motion.h1
            variants={fadeUp}
            className="text-3xl sm:text-4xl font-bold text-[#023337] tracking-tight text-balance mb-3"
          >
            This address doesn&rsquo;t exist on{" "}
            <span className="text-orange-500">Velte</span>.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-gray-500 text-[15px] leading-relaxed max-w-sm mx-auto mb-9"
          >
            The link you followed may be outdated, or the page has moved. Since
            you&rsquo;re here — why not tell us what you were actually looking
            for?
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-lg shadow-orange-500/20 transition-colors"
            >
              Search on Velte
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="text-sm font-medium text-gray-500 hover:text-[#023337] transition-colors px-6 py-3"
            >
              Back to home
            </Link>
          </motion.div>
        </motion.div>
      </main>
      <Footer />
    </>
  );
}
