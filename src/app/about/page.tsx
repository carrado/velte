"use client";

import Image from "next/image";
import { motion } from "motion/react";
import Link from "next/link";
import {
  Database,
  Search,
  Store,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import ShineSweep from "@/components/ShineSweep";

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
    icon: Search,
    title: "Buyer‑First",
    description:
      "Describe what you need in your own words or a photo — we do the matching, not you.",
  },
  {
    icon: Store,
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

const sides = [
  {
    audience: "For Buyers",
    icon: Search,
    points: [
      {
        title: "Describe it your way",
        detail: "Text or a photo — matched by meaning, not keywords",
      },
      {
        title: "See what's real",
        detail: "Only actual inventory, never an invented listing",
      },
      {
        title: "Closest match first",
        detail: "Proximity and trust decide the ranking, not ad spend",
      },
    ],
    cta: { label: "Start searching", href: "/search" },
  },
  {
    audience: "For Sellers",
    icon: Store,
    points: [
      {
        title: "List free, always",
        detail: "No listing fee or ad budget required to be found",
      },
      {
        title: "Found by real demand",
        detail: "Matched to buyers already searching nearby, right now",
      },
      {
        title: "Straight to WhatsApp",
        detail: "You get the conversation directly — no middleman",
      },
    ],
    cta: { label: "List your business", href: "/auth/signup" },
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

export default function About() {
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
                ].map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-[#023337] text-xs font-medium px-3 py-1.5 rounded-full shadow-sm"
                  >
                    <ShieldCheck className="w-3 h-3 text-orange-500" />
                    {badge}
                  </span>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Our Story */}
        <section className="max-w-7xl mx-auto px-5 sm:px-8 py-24">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
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
                Velte closes that gap from both sides. A buyer describes what
                they need — in plain language or a photo — and our AI matches it
                against real seller inventory by meaning, proximity, and trust,
                then hands the conversation straight to the vendor. No ads, no
                bidding, no invented listings — the model translates, the data
                decides, and the seller gets found.
              </p>
              <p className="text-gray-500 leading-relaxed">
                We&apos;re starting with one city, one category at a time —
                growing the list of real buyers and real sellers together.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
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
          </div>
        </section>

        {/* Built for both sides */}
        <section className="max-w-7xl mx-auto px-5 sm:px-8 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <span className="text-xs font-semibold tracking-widest text-orange-500 uppercase mb-3 block">
              Two sides, one platform
            </span>
            <h2 className="text-4xl font-bold text-[#023337] text-balance">
              Whether you&apos;re buying or selling, Velte works the same way
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="grid md:grid-cols-2 gap-6"
          >
            {sides.map(({ audience, icon: Icon, points, cta }) => (
              <motion.div
                key={audience}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm transition-shadow duration-200 hover:shadow-lg hover:shadow-gray-300/40"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-11 h-11 rounded-2xl bg-orange-500/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-orange-500" />
                  </div>
                  <h3 className="text-xl font-bold text-[#023337]">
                    {audience}
                  </h3>
                </div>

                <ul className="space-y-4 mb-7">
                  {points.map(({ title, detail }) => (
                    <li key={title} className="flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-[#023337]">
                          {title}
                        </p>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          {detail}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>

                <Link
                  href={cta.href}
                  className="inline-flex items-center gap-1.5 text-orange-600 font-semibold text-sm hover:text-orange-700 transition-colors"
                >
                  {cta.label}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </motion.div>
            ))}
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
                  <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-orange-500" />
                  </div>
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
                Try Velte as a buyer, or list your business so nearby buyers can
                find you.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/search">
                  <Button
                    size="lg"
                    className="bg-orange-500 cursor-pointer hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 gap-2 h-12 w-full sm:w-auto transition-transform hover:scale-[1.03] active:scale-[0.98]"
                  >
                    AI Search
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-gray-700 cursor-pointer hover:bg-gray-100 border-gray-300 h-12 w-full sm:w-auto transition-transform hover:scale-[1.03] active:scale-[0.98]"
                  >
                    List your business
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
