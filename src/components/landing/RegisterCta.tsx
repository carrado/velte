"use client";

import Link from "next/link";
import { motion } from "motion/react";
// Icons from Phosphor (2026-08-16, swapped from lucide-react for this
// session's pages only — see MobileMenu.tsx's comment). ClipboardList and
// MessageSquarePlus have no exact match; ClipboardText and ChatCircleText
// are their closest Phosphor equivalents.
import {
  ArrowRight,
  Bell,
  ChatCircleText,
  ClipboardText,
  Heart,
  Users,
  Wallet,
} from "@phosphor-icons/react";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// Rewritten 2026-08-14 — this section and VendorPitch used to be two
// separate, separately-labeled sections back to back ("Keep everything you
// find" for buyers, then a "FOR BUSINESSES" divider + its own pitch right
// underneath), which was the fix for an EARLIER problem (the two reading as
// one confused, audience-switching flow). Once /join became the single
// unified entry point for both journeys, keeping two full sections back to
// back just to say "click here" twice stopped earning its space — this is
// now the ONE closing section, worded for both audiences, and VendorPitch
// is retired (deleted, not just unused — see page.tsx).
//
// The two columns below are deliberately NOT labeled with a big "FOR
// BUYERS" / "FOR BUSINESSES" eyebrow the way the old split sections were —
// just a quiet parallel heading each ("Buying & discovering" / "Selling &
// growing" — matched phrasing weight on purpose, "Finding things" read
// noticeably more casual than "Selling things") — so this reads as one
// account with two sides, not two audiences being addressed separately
// again.
const buyerKeeps = [
  { icon: Heart, label: "Saved vendors & products" },
  { icon: ClipboardText, label: "Active requests" },
  { icon: Bell, label: "Price alerts" },
];

const sellerKeeps = [
  { icon: ChatCircleText, label: "Buyer requests" },
  { icon: Users, label: "Store followers" },
  // "Wallet & leads" read as jargon to a first-time visitor (2026-08-14
  // copy pass) — "leads" meant nothing without dashboard context. "Buyer
  // leads & wallet" leads with the word that actually explains the value.
  { icon: Wallet, label: "Buyer leads & wallet" },
];

function KeepList({
  heading,
  items,
}: {
  heading: string;
  items: { icon: React.ElementType; label: string }[];
}) {
  return (
    <div>
      <p className="text-white/40 text-xs font-semibold uppercase tracking-wide mb-3">
        {heading}
      </p>
      <div className="space-y-2">
        {items.map(({ icon: Icon, label }) => (
          <motion.div
            key={label}
            variants={fadeUp}
            className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5"
          >
            <Icon className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span className="text-[13px] font-medium text-white/80">
              {label}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function RegisterCta() {
  return (
    <section className="relative bg-[#023337] py-14 sm:py-16 overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -right-20 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-14 w-56 h-56 bg-orange-500/[0.07] rounded-full blur-3xl" />

      <div className="relative max-w-2xl mx-auto px-5 sm:px-8 text-center">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.h2
            variants={fadeUp}
            className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2 text-balance"
          >
            One Velte account.
            <br />
            For buying and selling.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-white/55 mb-9 max-w-md mx-auto"
          >
            Whether you&apos;re looking for something or selling it, Velte keeps
            your activity, requests and updates in one place.
          </motion.p>

          <motion.div
            variants={stagger}
            className="grid sm:grid-cols-2 gap-6 mb-9 text-left"
          >
            <KeepList heading="Buying & discovering" items={buyerKeeps} />
            <KeepList heading="Selling & growing" items={sellerKeeps} />
          </motion.div>

          <motion.div variants={fadeUp}>
            <Link
              href="/join"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-[15px] font-semibold shadow-lg shadow-orange-500/20 transition-colors"
            >
              Join Velte
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          <motion.p variants={fadeUp} className="text-white/40 text-xs mt-4">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-white/70 hover:text-white">
              Sign in
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
