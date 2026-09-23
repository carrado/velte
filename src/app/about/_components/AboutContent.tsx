"use client";

import Image from "next/image";
import { motion } from "motion/react";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import ShineSweep from "@/components/ShineSweep";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  CheckCircleIcon,
  DatabaseIcon,
  MapPinIcon,
  SearchIcon,
  ShieldCheckIcon,
  StoreIcon,
} from "@/components/icons/hero";

// Redesigned 2026-08-17 (second pass — see the 2026-08-16 history below for
// the content fixes, still all in place) — this page's visual identity
// changed to differentiate it from the other four relaunched pages this
// session (How It Works/Blog/FAQ/Careers, each deliberately distinct — see
// their own file comments). About's own signature is the real photo in
// "Our Story": the hero dropped the dot-grid backdrop + orbiting glow blobs
// (FAQ keeps that combination, so it doesn't read as copied) for a plainer,
// quieter frame that lets the photo section carry the page. The closing CTA
// dropped the spinning conic-gradient ring for the same reason — that stays
// FAQ's signature move alone now — in favor of a warm static gradient panel.
//
// 2026-08-16 history:
// 1. Both CTAs that used to point straight at /auth/signup now go to /join
//    (the unified buyer/business chooser, built 2026-08-14) — every other
//    surface on the site routes that path through /join already; this page
//    was the one holdout still reopening the "which button do I click"
//    ambiguity /join exists to remove.
// 2. "Built for both sides" shrank from two full bullet-list cards with
//    their own CTAs down to a slim two-column band that links out to
//    /how-it-works instead of restating it.
// 3. Icons swapped to the custom set — see [[custom_icon_system]].
//
// No fabricated numbers anywhere on this page — same rule the marketplace
// pages hold to (see MarketplaceTabs's own comments): nothing here claims a
// vendor count, a buyer count, or any stat that isn't true today.

// Photo credit: Ben Iwara / Unsplash (unsplash.com/photos/w1EaPjX71Sw) —
// two women at a food stall, Benin City, Nigeria. Unsplash's license
// doesn't require attribution, but it's kept here for maintainability.
const storyPhoto = {
  src: "/ben-iwara-w1EaPjX71Sw-unsplash.jpg",
  alt: "Two women at a food stall, Benin City, Nigeria",
};

const values = [
  {
    icon: DatabaseIcon,
    title: "Real Data Only",
    description:
      "Our AI never invents a vendor, price, or stock level — every result comes straight from the database.",
  },
  {
    icon: SearchIcon,
    title: "Buyer‑First",
    description:
      "Browse real listings directly, or describe what you need in your own words or a photo — either way, we do the matching, not you.",
  },
  {
    icon: StoreIcon,
    title: "Seller Empowerment",
    description:
      "Any real seller is discoverable — no listing fee or ad budget required.",
  },
  {
    icon: MapPinIcon,
    title: "Proximity & Trust",
    description:
      "The nearest genuine match wins — not whoever paid for placement.",
  },
];

// Slimmed 2026-08-16 (see file-level comment) — three short lines each,
// not a duplicate of /how-it-works' full step sequence.
const sides = [
  {
    audience: "For buyers",
    icon: SearchIcon,
    points: [
      "Browse real listings, or describe what you need",
      "Matched by meaning, proximity and trust — never invented",
      "Straight to the vendor's chat, no middleman",
    ],
  },
  {
    audience: "For sellers",
    icon: StoreIcon,
    points: [
      "List free, always — no fee or ad budget required",
      "Found by real demand, matched nearby",
      "Pay only when we send a genuine, matched lead",
    ],
  },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function AboutContent() {
  return (
    <>
      <Navbar />
      <main className="bg-canvas min-h-screen pt-20 sm:pt-24 pb-20">
        {/* Hero — plain, no grid backdrop or glow blobs (that combination
            is FAQ's signature); the headline and badges carry this one. */}
        <section className="relative overflow-hidden">
          <div className="relative max-w-3xl mx-auto px-5 sm:px-8 text-center">
            <motion.div initial="hidden" animate="show" variants={stagger}>
              <motion.h1
                variants={fadeUp}
                className="text-5xl lg:text-6xl font-bold text-ink mb-6 tracking-tight text-balance"
              >
                Real buyers. Real sellers.
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500">
                  No middlemen.
                </span>
              </motion.h1>
              <motion.p
                variants={fadeUp}
                className="text-gray-500 text-lg max-w-2xl mx-auto leading-relaxed mb-8"
              >
                Velte was built for two people at once: the buyer who knows
                exactly what they need, and the seller who already has it. We
                match them by meaning, proximity and trust — then get out of the
                way.
              </motion.p>

              <motion.div
                variants={fadeUp}
                className="flex flex-wrap items-center justify-center gap-2.5"
              >
                {[
                  "Real vendors only",
                  "No invented listings",
                  "Built for both sides",
                ].map((badge, i) => (
                  <motion.span
                    key={badge}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + i * 0.08, duration: 0.35 }}
                    className="inline-flex items-center gap-1.5 bg-surface border border-gray-200 text-ink text-xs font-medium px-3 py-1.5 rounded-full shadow-sm"
                  >
                    <ShieldCheckIcon className="w-3 h-3 text-orange-500" />
                    {badge}
                  </motion.span>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Our Story */}
        <section className="max-w-7xl mx-auto px-5 sm:px-8 py-24">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="grid md:grid-cols-2 gap-16 items-center"
          >
            <motion.div variants={fadeUp}>
              <span className="text-xs font-semibold tracking-widest text-orange-500 uppercase mb-3 block">
                Our story
              </span>
              <h2 className="text-4xl font-bold text-ink mb-6 text-balance">
                Finding each other shouldn&apos;t be this hard
              </h2>
              <p className="text-gray-500 leading-relaxed mb-4">
                Search online for almost anything and you&apos;ll find outdated
                listings, dead links, and ads for products no one actually has
                in stock. Meanwhile, real sellers — the ones a few streets away
                with exactly what a buyer needs — stay invisible, because
                discovery today runs on ad budgets and bidding wars, not on who
                genuinely has the goods.
              </p>
              <p className="text-gray-500 leading-relaxed mb-4">
                Velte closes that gap from both sides. A buyer can browse real
                seller listings directly, or describe what they need — in plain
                language or a photo — for our AI to match it against that same
                real inventory by meaning, proximity, and trust. Either way, the
                conversation goes straight to the vendor. No ads, no bidding, no
                invented listings — the data decides, and the seller gets found.
              </p>
              <p className="text-gray-500 leading-relaxed">
                We&apos;re starting with one city, one category at a time —
                growing the list of real buyers and real sellers together.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} className="relative">
              <motion.div
                initial={{ rotate: 2 }}
                whileInView={{ rotate: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                whileHover={{ rotate: -1, scale: 1.015 }}
              >
                <motion.div
                  animate={{ y: [0, -12, 0] }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="relative h-96 rounded-3xl overflow-hidden shadow-xl shadow-gray-300/50"
                >
                  <Image
                    src={storyPhoto.src}
                    alt={storyPhoto.alt}
                    fill
                    sizes="(min-width: 768px) 560px, 90vw"
                    quality={90}
                    className="object-cover"
                  />
                  <ShineSweep />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <p className="text-white text-sm font-semibold">
                      Real sellers, real stock
                    </p>
                    <p className="text-white/70 text-xs mt-0.5">
                      Every match on Velte comes from an actual business nearby
                    </p>
                  </div>
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.35, duration: 0.5 }}
                className="absolute -left-4 -bottom-4 hidden sm:flex items-center gap-2 bg-surface border border-orange-200 rounded-xl px-3 py-2 shadow-lg"
              >
                <ShieldCheckIcon className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span className="text-ink text-[11px] font-medium whitespace-nowrap">
                  Matched, not invented
                </span>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        {/* Built for both sides — slim band, not a full duplicate of
            /how-it-works (see file-level comment). */}
        <section className="max-w-5xl mx-auto px-5 sm:px-8 pb-24">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="bg-surface border border-gray-200 rounded-3xl shadow-sm p-8 sm:p-10"
          >
            <motion.div variants={fadeUp} className="text-center mb-10">
              <span className="text-xs font-semibold tracking-widest text-orange-500 uppercase mb-3 block">
                Two sides, one platform
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-ink text-balance">
                Whether you&apos;re buying or selling, Velte works the same way
              </h2>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-10 mb-8">
              {sides.map(({ audience, icon: Icon, points }) => (
                <motion.div key={audience} variants={fadeUp}>
                  <div className="flex items-center gap-2.5 mb-4">
                    <motion.div
                      whileHover={{ rotate: -8, scale: 1.08 }}
                      className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0"
                    >
                      <Icon className="w-4 h-4 text-orange-500" />
                    </motion.div>
                    <h3 className="text-base font-bold text-ink">{audience}</h3>
                  </div>
                  <ul className="space-y-2.5">
                    {points.map((point) => (
                      <li key={point} className="flex items-start gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-500 leading-relaxed">
                          {point}
                        </span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>

            <motion.div
              variants={fadeUp}
              className="text-center pt-6 border-t border-gray-100"
            >
              <Link
                href="/how-it-works"
                className="inline-flex items-center gap-1.5 text-orange-600 font-semibold text-sm hover:text-orange-700 transition-colors"
              >
                See the full flow, step by step
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* Values */}
        <section className="max-w-7xl mx-auto px-5 sm:px-8 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <span className="text-xs font-semibold tracking-widest text-orange-500 uppercase mb-3 block">
              What we believe
            </span>
            <h2 className="text-4xl font-bold text-ink">Our core values</h2>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {values.map((value) => {
              const Icon = value.icon;
              return (
                <motion.div
                  key={value.title}
                  variants={fadeUp}
                  whileHover={{ y: -4 }}
                  className="bg-surface border border-gray-200 shadow-sm rounded-xl p-6 text-center transition-shadow duration-200 hover:shadow-lg hover:shadow-gray-300/40"
                >
                  <motion.div
                    whileHover={{ rotate: -8, scale: 1.1 }}
                    className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mx-auto mb-4"
                  >
                    <Icon className="w-6 h-6 text-orange-500" />
                  </motion.div>
                  <h3 className="text-ink font-semibold text-lg mb-2">
                    {value.title}
                  </h3>
                  <p className="text-gray-500 text-sm">{value.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </section>

        {/* CTA — redesigned 2026-09-23 (explicit request). Was one centred
            block on `bg-white/60`, which stays literal white in dark mode
            (only bg-surface is themed) while ink/gray text flip light — a
            grey haze with near-invisible copy. Now one card per audience,
            the usual way a closer serves two kinds of reader: each says who
            it's for, what they get, and has its own action, instead of two
            buttons under one sentence trying to address both at once.
            Themed tokens only (surface, ink, gray ramp), so it holds in both
            modes. The /chat and /auth/signup targets are unchanged — see
            git history for why each points where it does. */}
        <section className="max-w-7xl mx-auto px-5 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center mb-8 sm:mb-10">
              <h3 className="text-2xl sm:text-3xl font-bold text-ink mb-3 text-balance">
                Looking for something, or have something to sell?
              </h3>
              <p className="text-gray-500 max-w-xl mx-auto">
                Velte works for both sides of the deal. Pick where you fit.
              </p>
            </div>

            <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
              <div className="flex flex-col rounded-2xl border border-gray-200 bg-surface p-6 sm:p-8">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 mb-5">
                  <SearchIcon className="w-5 h-5 text-orange-500" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                  For buyers
                </p>
                <h4 className="text-lg font-semibold text-ink mb-2">
                  Find it from a real vendor nearby
                </h4>
                <p className="text-sm text-gray-500 leading-relaxed mb-6">
                  Describe what you need in your own words or send a photo —
                  Velte shows you vendors who actually have it, then you chat
                  with them directly.
                </p>
                <Link href="/chat" className="mt-auto">
                  <Button
                    size="lg"
                    className="bg-orange-500 cursor-pointer hover:bg-orange-600 text-white gap-2 h-11 w-full sm:w-auto"
                  >
                    Find something now
                    <ArrowRightIcon className="w-4 h-4" />
                  </Button>
                </Link>
              </div>

              <div className="flex flex-col rounded-2xl border border-gray-200 bg-surface p-6 sm:p-8">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 mb-5">
                  <StoreIcon className="w-5 h-5 text-ink" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                  For vendors
                </p>
                <h4 className="text-lg font-semibold text-ink mb-2">
                  Get found by buyers already looking
                </h4>
                <p className="text-sm text-gray-500 leading-relaxed mb-6">
                  List your products and services once. Velte matches you to
                  real buyer demand nearby, and you only pay when a buyer
                  reaches out.
                </p>
                <Link href="/auth/signup" className="mt-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-ink cursor-pointer hover:bg-gray-100 border-gray-300 gap-2 h-11 w-full sm:w-auto"
                  >
                    Join as a vendor
                    <ArrowUpRightIcon className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </section>
      </main>
      <Footer />
    </>
  );
}
