"use client";

import Image from "next/image";
import { motion } from "motion/react";
import Link from "next/link";
import {
  Database,
  MagnifyingGlass,
  Storefront,
  MapPin,
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  SquaresFour,
  CheckCircle,
} from "@phosphor-icons/react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { AskVeluxButton } from "@/components/AskVeluxButton";
import ShineSweep from "@/components/ShineSweep";

// Redesigned 2026-08-16 — three real fixes, not just a visual pass:
//
// 1. Both CTAs that used to point straight at /auth/signup now go to /join
//    (the unified buyer/business chooser, built 2026-08-14) — every other
//    surface on the site routes that path through /join already; this page
//    was the one holdout still reopening the "which button do I click"
//    ambiguity /join exists to remove.
//
// 2. "Built for both sides" shrank from two full bullet-list cards with
//    their own CTAs down to a slim two-column band that links out to
//    /how-it-works instead of restating it — once that page shipped
//    (2026-08-16), this section's old form duplicated it almost line for
//    line. This version leans into what About is actually for (why this
//    matters) and hands the procedural detail (what happens, in order) to
//    the page built specifically for that.
//
// 3. Icons swapped to Phosphor (this page is a substantial redesign this
//    session, same reasoning as the other pages that got the swap — see
//    MobileMenu.tsx's own comment) and animation is more consistent
//    end-to-end: Our Story used to run its own bespoke x-slide transitions
//    outside the shared stagger/fadeUp system every other section uses;
//    it's on that shared system now too (its distinctive photo
//    tilt/float/hover treatment is untouched — that was already good, it
//    just needed to sit inside the same reveal rhythm as everything else).
//
// No fabricated numbers anywhere on this page — same rule the marketplace
// pages hold to (see MarketplaceTabs's own comments): nothing here claims a
// vendor count, a buyer count, or any stat that isn't true today.

// Photo credit: Ben Iwara / Unsplash (unsplash.com/photos/w1EaPjX71Sw) —
// two women at a food stall, Benin City, Nigeria. Unsplash's license
// doesn't require attribution, but it's kept here for maintainability.
const storyPhoto = {
  src: "https://images.unsplash.com/photo-1765584830351-b751c8937c75",
  alt: "Two women at a food stall, Benin City, Nigeria",
};

const values = [
  {
    icon: Database,
    title: "Real Data Only",
    description:
      "Our AI never invents a vendor, price, or stock level — every result comes straight from the database.",
  },
  {
    icon: MagnifyingGlass,
    title: "Buyer‑First",
    description:
      "Browse real listings directly, or describe what you need in your own words or a photo — either way, we do the matching, not you.",
  },
  {
    icon: Storefront,
    title: "Seller Empowerment",
    description:
      "Any real seller is discoverable — no listing fee or ad budget required.",
  },
  {
    icon: MapPin,
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
    icon: MagnifyingGlass,
    points: [
      "Browse real listings, or describe what you need",
      "Matched by meaning, proximity and trust — never invented",
      "Straight to the vendor's chat, no middleman",
    ],
  },
  {
    audience: "For sellers",
    icon: Storefront,
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
      <main className="bg-[#F1F5F9] min-h-screen pt-20 sm:pt-24 pb-20">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `linear-gradient(rgba(249,115,22,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.5) 1px, transparent 1px)`,
              backgroundSize: "64px 64px",
              maskImage:
                "radial-gradient(ellipse 70% 60% at 50% 20%, black, transparent)",
            }}
          />
          {/* Soft glows — same treatment Hero.tsx's own homepage composer
              uses, so the brand's "AI section" feel is consistent, not a
              one-off effect invented for this page. */}
          <div className="absolute top-10 left-1/4 w-[420px] h-[420px] bg-orange-400/[0.08] rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-orange-400/[0.06] rounded-full blur-[80px] pointer-events-none" />

          <div className="relative max-w-3xl mx-auto px-5 sm:px-8 text-center">
            <motion.div initial="hidden" animate="show" variants={stagger}>
              <motion.h1
                variants={fadeUp}
                className="text-5xl lg:text-6xl font-bold text-[#023337] mb-6 tracking-tight text-balance"
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
                    className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-[#023337] text-xs font-medium px-3 py-1.5 rounded-full shadow-sm"
                  >
                    <ShieldCheck className="w-3 h-3 text-orange-500" />
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
              <h2 className="text-4xl font-bold text-[#023337] mb-6 text-balance">
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
                className="absolute -left-4 -bottom-4 hidden sm:flex items-center gap-2 bg-white border border-orange-200 rounded-xl px-3 py-2 shadow-lg"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span className="text-[#023337] text-[11px] font-medium whitespace-nowrap">
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
            className="bg-white border border-gray-200 rounded-3xl shadow-sm p-8 sm:p-10"
          >
            <motion.div variants={fadeUp} className="text-center mb-10">
              <span className="text-xs font-semibold tracking-widest text-orange-500 uppercase mb-3 block">
                Two sides, one platform
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#023337] text-balance">
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
                    <h3 className="text-base font-bold text-[#023337]">
                      {audience}
                    </h3>
                  </div>
                  <ul className="space-y-2.5">
                    {points.map((point) => (
                      <li key={point} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
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
                <ArrowRight className="w-3.5 h-3.5" />
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
            <h2 className="text-4xl font-bold text-[#023337]">
              Our core values
            </h2>
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
                  className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 text-center transition-shadow duration-200 hover:shadow-lg hover:shadow-gray-300/40"
                >
                  <motion.div
                    whileHover={{ rotate: -8, scale: 1.1 }}
                    className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mx-auto mb-4"
                  >
                    <Icon className="w-6 h-6 text-orange-500" />
                  </motion.div>
                  <h3 className="text-[#023337] font-semibold text-lg mb-2">
                    {value.title}
                  </h3>
                  <p className="text-gray-500 text-sm">{value.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </section>

        {/* CTA */}
        <section className="max-w-7xl mx-auto px-5 sm:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative rounded-3xl p-[1px] overflow-hidden"
          >
            <div
              className="absolute -inset-[60%] animate-spin-slow opacity-70"
              style={{
                background:
                  "conic-gradient(from 0deg, transparent 0%, rgba(249,115,22,0.5) 12%, transparent 24%)",
              }}
            />
            <div className="relative bg-gradient-to-br from-orange-500/[0.08] to-[#F1F5F9] rounded-3xl p-12 text-center">
              <h3 className="text-3xl font-bold text-[#023337] mb-4 text-balance">
                Looking for something, or have something to sell?
              </h3>
              <p className="text-gray-500 mb-6 max-w-xl mx-auto">
                Browse real listings as a buyer, or list your business so nearby
                buyers can find you.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {/* Was href="/" + scrollToMarketplace, scrolling to a
                    homepage #marketplace section — that section
                    (MarketplacePreview) was removed from page.tsx during
                    the AI-agent pivot and isn't rendered anywhere anymore,
                    so the scroll silently did nothing. Points straight at
                    the real destination now, same fix as FaqContent.tsx's
                    own "Browse Products" CTA. */}
                <Link href="/marketplace">
                  <Button
                    size="lg"
                    className="bg-orange-500 cursor-pointer hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 gap-2 h-12 w-full sm:w-auto transition-transform hover:scale-[1.03] active:scale-[0.98]"
                  >
                    <SquaresFour className="w-4 h-4" />
                    Browse Products
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                {/* → /auth/signup directly — /join is just a redirect
                    shim now (kept alive for old external links/bookmarks),
                    so this skips the extra hop, same as Navbar's own "Join"
                    button. */}
                <Link href="/auth/signup">
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-gray-700 cursor-pointer hover:bg-gray-100 border-gray-300 h-12 w-full sm:w-auto transition-transform hover:scale-[1.03] active:scale-[0.98] gap-2"
                  >
                    List your business
                    <ArrowUpRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
              <div className="flex justify-center mt-5">
                <AskVeluxButton
                  label="Ask Velte"
                  subtext="Velte's AI shopping assistant"
                />
              </div>
            </div>
          </motion.div>
        </section>
      </main>
      <Footer />
    </>
  );
}
