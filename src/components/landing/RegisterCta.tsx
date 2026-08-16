"use client";

import Link from "next/link";
import { motion } from "motion/react";
// Icons from Phosphor (2026-08-16, swapped from lucide-react for this
// session's pages only — see MobileMenu.tsx's comment). MessageSquarePlus
// has no exact match; ChatCircleText is its closest Phosphor equivalent.
import {
  ArrowRight,
  ChatCircleText,
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

// Vendor-only again as of 2026-08-16 (was briefly a shared "one account,
// two sides" closer for both audiences, 2026-08-14 through 2026-08-15 —
// see git history on this file for that version). The "why do buyers have
// to sign up" decision retired buyer accounts as a thing anyone "joins":
// a buyer's identity is just a verified phone number, created silently the
// first time it's actually needed, never a CTA to click on the homepage.
// Keeping the old shared framing here would have this section telling a
// buyer to "Join Velte" one screen after FinalAskCta (directly above)
// already told them the opposite — just ask, nothing to sign up for.
//
// That leaves this as the vendor half of the old split, on its own, doing
// real work FinalAskCta doesn't: it's the only place on the homepage (the
// navbar's bare "Join" button aside) that actually makes the case to a
// vendor for why they'd list — not just where to click.
const sellerKeeps = [
  { icon: ChatCircleText, label: "Buyer requests" },
  { icon: Users, label: "Store followers" },
  // "Wallet & leads" read as jargon to a first-time visitor (2026-08-14
  // copy pass) — "leads" meant nothing without dashboard context. "Buyer
  // leads & wallet" leads with the word that actually explains the value.
  { icon: Wallet, label: "Buyer leads & wallet" },
];

function KeepList({
  items,
}: {
  items: { icon: React.ElementType; label: string }[];
}) {
  return (
    <motion.div
      variants={stagger}
      className="flex flex-wrap items-center justify-center gap-2.5 mb-9"
    >
      {items.map(({ icon: Icon, label }) => (
        <motion.div
          key={label}
          variants={fadeUp}
          className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2"
        >
          <Icon className="w-3.5 h-3.5 text-orange-400 shrink-0" />
          <span className="text-[13px] font-medium text-white/80">{label}</span>
        </motion.div>
      ))}
    </motion.div>
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
            Run your business from one dashboard.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-white/55 mb-9 max-w-md mx-auto"
          >
            List once — Velte matches you against real buyer demand nearby, and
            keeps every request, follower and payout in one place.
          </motion.p>

          <KeepList items={sellerKeeps} />

          <motion.div variants={fadeUp}>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-[15px] font-semibold shadow-lg shadow-orange-500/20 transition-colors"
            >
              List your business
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          <motion.p variants={fadeUp} className="text-white/40 text-xs mt-4">
            Already listing?{" "}
            <Link href="/auth/login" className="text-white/70 hover:text-white">
              Sign in
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
