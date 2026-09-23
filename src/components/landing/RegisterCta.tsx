"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRightIcon,
  MessageCircleIcon,
  StoreIcon,
  WalletIcon,
} from "@/components/icons/hero";
import type { IconComponent } from "@/types/common";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// The homepage's one vendor pitch — the navbar's bare "Join" aside, the only
// place that makes the case for listing rather than just where to click.
//
// Redesigned 2026-09-23 (explicit request for a more standard, professional
// layout): was a centred headline over three pill chips on a #023337 band.
// Now the conventional two-column CTA — pitch and both actions on the left,
// what a vendor gets on the right as titled rows with a one-line
// explanation each — inside a contained panel. The pills named features
// without saying what they do; the rows say it. `bg-slab`, not #023337:
// that colour is a text colour in this palette, never a surface, and slab is
// the token for a deliberately dark section that stays dark in dark mode.
const vendorFeatures: {
  icon: IconComponent;
  title: string;
  description: string;
}[] = [
  {
    icon: MessageCircleIcon,
    title: "Buyer requests",
    description:
      "See what buyers near you are asking for, and respond to the ones you can fulfil.",
  },
  {
    icon: StoreIcon,
    title: "Your own storefront",
    description:
      "One shareable page for your products and services — the catalogue Velte matches buyers against.",
  },
  {
    icon: WalletIcon,
    title: "Buyer leads & wallet",
    description:
      "Pay only when a buyer actually reaches out, from a simple prepaid wallet.",
  },
];

export function RegisterCta() {
  return (
    <section className="py-14 sm:py-20">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="relative overflow-hidden rounded-3xl bg-slab px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-14"
        >
          <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl" />

          <div className="relative grid gap-10 lg:grid-cols-2 lg:gap-16 lg:items-center">
            <div>
              <motion.p
                variants={fadeUp}
                className="text-xs font-semibold uppercase tracking-wider text-orange-400 mb-3"
              >
                For vendors
              </motion.p>
              <motion.h2
                variants={fadeUp}
                className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight mb-4 text-balance"
              >
                Run your business from one dashboard.
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="text-white/65 leading-relaxed mb-8 max-w-md"
              >
                List once — Velte matches you against real buyer demand nearby,
                and keeps every request, follower and payout in one place.
              </motion.p>

              <motion.div
                variants={fadeUp}
                className="flex flex-col sm:flex-row gap-3"
              >
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[15px] font-semibold transition-colors"
                >
                  Join as a vendor
                  <ArrowRightIcon className="w-4 h-4" />
                </Link>
                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-white/15 text-white/85 hover:bg-white/5 hover:text-white text-[15px] font-medium transition-colors"
                >
                  Sign in
                </Link>
              </motion.div>
            </div>

            <motion.ul variants={stagger} className="space-y-3">
              {vendorFeatures.map(({ icon: Icon, title, description }) => (
                <motion.li
                  key={title}
                  variants={fadeUp}
                  className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/15">
                    <Icon className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-white">
                      {title}
                    </h3>
                    <p className="mt-1 text-sm text-white/60 leading-relaxed">
                      {description}
                    </p>
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
