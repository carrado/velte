"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { cn } from "@/lib/utils";
import {
  ArrowRightIcon,
  CameraIcon,
  MessageCircleIcon,
  PackageIcon,
  ShieldCheckIcon,
  SparkleIcon,
  StoreIcon,
  UserRoundIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/icons";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

// Buyer steps mirror Hero.tsx's composer + VeluxShowcase's photo-search
// example — nothing claimed here that isn't already live product behavior.
const buyerSteps = [
  {
    icon: CameraIcon,
    title: "Describe what you need",
    detail:
      "Type it in your own words, or snap a photo — Velte takes either one, same as the search box on the homepage.",
  },
  {
    icon: SparkleIcon,
    title: "Velte matches you to real vendors",
    detail:
      "Ranked by meaning, proximity and trust — never invented. If nothing real matches nearby, you're told that too.",
  },
  {
    icon: MessageCircleIcon,
    title: "Chat directly, no middleman",
    detail:
      "You're handed straight to the vendor's chat to work out price and pickup yourselves — Velte doesn't sit in between.",
  },
];

// Vendor steps mirror RegisterCta's seller keeps and the pay-per-lead model
// described on /pricing — "free to list, pay only for a matched lead" is a
// real, current claim, not aspirational copy.
const vendorSteps = [
  {
    icon: PackageIcon,
    title: "List your products, free",
    detail:
      "No subscription, no listing fee to appear in buyer searches — see /pricing for the full breakdown.",
  },
  {
    icon: UsersIcon,
    title: "Get matched to real buyer requests",
    detail:
      "Velte sends you buyers already looking for what you sell nearby, plus requests posted directly to your store.",
  },
  {
    icon: WalletIcon,
    title: "Chat and close — pay only for real leads",
    detail:
      "Respond straight in WhatsApp. You're only charged when we send a genuine, matched lead, from your wallet.",
  },
];

const journeys = {
  buyer: {
    label: "I'm buying",
    icon: UserRoundIcon,
    steps: buyerSteps,
    cta: { label: "Try Velte yourself", href: "/chat" },
  },
  vendor: {
    label: "I'm selling",
    icon: StoreIcon,
    steps: vendorSteps,
    cta: { label: "List your business", href: "/auth/signup" },
  },
} as const;

type JourneyKey = keyof typeof journeys;

// Redesigned 2026-08-17 — swapped the old static two-column card list for
// an actual connected-journey visualization: a drawn-on-scroll vertical
// line threading through numbered nodes, one path at a time via a buyer/
// seller toggle rather than both columns shown at once. That toggle is the
// deliberate differentiator from the other four relaunched pages this
// session (About/Blog/FAQ/Careers) — none of them share a route/journey
// visual language, a dot-grid backdrop, or a conic-gradient CTA; this one
// closes with two parallel path-continuation cards instead.
export default function HowItWorksContent() {
  const [active, setActive] = useState<JourneyKey>("buyer");
  const journey = journeys[active];

  return (
    <>
      <Navbar />
      <main className="bg-white min-h-screen pt-28 sm:pt-32 pb-24">
        <section className="max-w-2xl mx-auto px-5 sm:px-8 text-center mb-12">
          <motion.div initial="hidden" animate="show" variants={stagger}>
            <motion.span
              variants={fadeUp}
              className="inline-block text-xs font-semibold tracking-widest text-orange-500 uppercase mb-3"
            >
              How it works
            </motion.span>
            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl font-bold text-[#023337] tracking-tight text-balance mb-4"
            >
              Two paths. Same rule: nothing invented.
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="text-gray-500 leading-relaxed max-w-md mx-auto"
            >
              Pick the path that&apos;s yours — every step below is what
              actually happens on Velte today, not a roadmap.
            </motion.p>
          </motion.div>
        </section>

        {/* Toggle */}
        <div className="flex justify-center mb-16 sm:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="relative inline-flex items-center bg-gray-100 rounded-full p-1"
          >
            {(Object.keys(journeys) as JourneyKey[]).map((key) => {
              const isActive = key === active;
              const Icon = journeys[key].icon;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActive(key)}
                  className={cn(
                    "relative z-10 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-colors cursor-pointer",
                    isActive
                      ? "text-white"
                      : "text-gray-500 hover:text-gray-700",
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="journey-toggle-pill"
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 32,
                      }}
                      className="absolute inset-0 bg-orange-500 rounded-full -z-10"
                    />
                  )}
                  <Icon className="w-4 h-4" />
                  {journeys[key].label}
                </button>
              );
            })}
          </motion.div>
        </div>

        {/* Journey path */}
        <section className="max-w-xl mx-auto px-5 sm:px-8 mb-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              {/* Connecting line, drawn on scroll — sits behind the node
                  circles (z-0 vs their z-10), spanning from the center of
                  the first node to the center of the last. */}
              <motion.div
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: "easeInOut" }}
                style={{ transformOrigin: "top" }}
                className="absolute left-[27px] top-7 bottom-7 w-0.5 bg-gradient-to-b from-orange-400 via-orange-300 to-orange-200"
              />

              <motion.div
                initial="hidden"
                animate="show"
                variants={stagger}
                className="space-y-8"
              >
                {journey.steps.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <motion.div
                      key={step.title}
                      variants={fadeUp}
                      className="relative flex gap-5"
                    >
                      <div className="relative z-10 w-14 h-14 rounded-2xl bg-white border-2 border-orange-400 flex items-center justify-center shrink-0 shadow-sm shadow-orange-200/50">
                        <Icon className="w-6 h-6 text-orange-500" />
                      </div>
                      <div className="pt-1.5">
                        <p className="text-[11px] font-bold text-orange-400 tracking-widest uppercase mb-1">
                          Step {i + 1}
                        </p>
                        <h3 className="text-lg font-bold text-[#023337] mb-1.5">
                          {step.title}
                        </h3>
                        <p className="text-sm text-gray-500 leading-relaxed">
                          {step.detail}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>

              <motion.div
                variants={fadeUp}
                className="relative flex gap-5 mt-8"
              >
                <div className="relative z-10 w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/25">
                  <ShieldCheckIcon className="w-6 h-6 text-white" />
                </div>
                <div className="pt-1.5">
                  <Link
                    href={journey.cta.href}
                    className="inline-flex items-center gap-2 text-[#023337] font-bold hover:text-orange-600 transition-colors"
                  >
                    {journey.cta.label}
                    <ArrowRightIcon className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </section>

        {/* Closing — two parallel path-continuation cards, not one central
            CTA, so the "two paths" framing carries all the way through. */}
        <section className="max-w-3xl mx-auto px-5 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid sm:grid-cols-2 gap-4"
          >
            <Link
              href="/chat"
              className="group bg-[#023337] rounded-2xl p-6 flex flex-col justify-between gap-6 hover:bg-[#02444a] transition-colors"
            >
              <div>
                <UserRoundIcon className="w-6 h-6 text-orange-400 mb-3" />
                <p className="text-white font-bold mb-1">
                  Ready to find something?
                </p>
                <p className="text-white/60 text-sm">
                  Describe it to Velte, right now.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-orange-400 font-semibold text-sm">
                Start searching
                <ArrowRightIcon className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
            <Link
              href="/auth/signup"
              className="group bg-orange-500 rounded-2xl p-6 flex flex-col justify-between gap-6 hover:bg-orange-600 transition-colors"
            >
              <div>
                <StoreIcon className="w-6 h-6 text-white mb-3" />
                <p className="text-white font-bold mb-1">
                  Ready to start selling?
                </p>
                <p className="text-white/80 text-sm">
                  Free to list — pay only for real leads.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-white font-semibold text-sm">
                Join Velte
                <ArrowRightIcon className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </motion.div>
        </section>
      </main>
      <Footer />
    </>
  );
}
