"use client";

import { motion } from "motion/react";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// A real flag SVG, not the 🇳🇬 emoji — regional-indicator flag emoji don't
// render as flags on Windows (no flag glyphs in Segoe UI Emoji on most
// builds), just the literal two letters "NG", which read as a typo on this
// user's own machine. An inline SVG renders identically everywhere,
// independent of OS emoji font support. Official proportions (1:2,
// height:width) and color (#008751).
function NigerianFlag({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 6 4"
      className={className}
      role="img"
      aria-label="Nigerian flag"
    >
      <rect width="2" height="4" fill="#008751" />
      <rect x="2" width="2" height="4" fill="#ffffff" />
      <rect x="4" width="2" height="4" fill="#008751" />
    </svg>
  );
}

// A short trust/localization strip — no stats, no logos (there aren't any
// to show honestly at 25 vendors, see page.tsx's own comment on why the
// current supply size never becomes a headline number anywhere on this
// page). Just the one claim this product can make honestly today: it
// understands Nigerian phrasing and Nigerian places, not a generic
// international shopping bot with Naira bolted on.
export function BuiltForNigeria() {
  return (
    <section className="relative bg-[#F1F5F9] border-t border-gray-100 py-10 sm:py-12">
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        variants={fadeUp}
        className="max-w-xl mx-auto px-5 sm:px-8 text-center"
      >
        <h2 className="inline-flex items-center gap-2.5 text-xl sm:text-2xl font-bold text-[#023337] tracking-tight mb-2 text-balance">
          Built for Nigeria
          <NigerianFlag className="w-6 h-4 rounded-[3px] shadow-sm ring-1 ring-black/10 shrink-0" />
        </h2>
        <p className="text-gray-500">
          Velte understands the way you actually talk — Nigerian terms, Nigerian
          places, Naira prices — and matches you with real businesses near you.
        </p>
      </motion.div>
    </section>
  );
}
