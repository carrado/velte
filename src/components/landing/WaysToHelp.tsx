"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Compass, MessageSquarePlus } from "lucide-react";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

// Trimmed 2026-08-15 — used to be three large, padded cards with a
// paragraph and a CTA link each, eating most of the first screen on
// mobile. The hero already made the pitch; this just names the real jobs
// in one compact row so the mental model is set before the visitor scrolls
// any further — no cards, no CTAs, one word + one short line each.
//
// Down to two items (2026-08-15) — "Choose" pointed at a real "Velux picks
// a winner and says why" feature that was built then pulled the same day
// (see searchProductsTool.ts's git history: the live catalog has no
// product with 2+ vendors both pricing it, so it had nothing to actually
// compare). Rather than leave a vague "Choose" pointing at plain /velux
// with no real differentiation from "Find", it's cut entirely until the
// compare feature is rebuilt and genuinely has something to say.
const ways = [
  {
    icon: Compass,
    title: "Find",
    body: "Search products, businesses and services.",
    href: "/velux",
  },
  {
    icon: MessageSquarePlus,
    title: "Request",
    body: "Can't find it? Let vendors respond.",
    href: "/buyer/requests/new",
  },
];

export function WaysToHelp() {
  return (
    <section className="relative bg-white border-t border-gray-100 py-8 sm:py-10">
      <div className="max-w-4xl mx-auto px-5 sm:px-8">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          variants={stagger}
          className="flex justify-center gap-8 sm:gap-16 divide-x divide-gray-100"
        >
          {ways.map(({ icon: Icon, title, body, href }) => (
            <motion.div key={title} variants={fadeUp} className="px-3 sm:px-4">
              <Link
                href={href}
                className="group flex flex-col items-center sm:items-start text-center sm:text-left gap-1"
              >
                <span className="inline-flex items-center gap-1.5 text-[#023337] font-bold text-sm sm:text-base">
                  <Icon className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  {title}
                </span>
                <span className="text-[11px] sm:text-xs text-gray-400 leading-snug group-hover:text-gray-600 transition-colors">
                  {body}
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
