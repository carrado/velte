"use client";

import { motion } from "motion/react";
import Link from "next/link";
import {
  ArrowRight,
  MapPin,
  ShieldCheck,
  Sparkles,
  Store as StoreIcon,
  Search as SearchIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};

const valueProps = [
  {
    icon: StoreIcon,
    title: "Real vendors, not listings",
    subtitle: "Every result comes straight from the database — never invented",
  },
  {
    icon: Sparkles,
    title: "Matched by meaning, not keywords",
    subtitle: "Describe it in your own words, in text or a photo",
  },
  {
    icon: MapPin,
    title: "Closest vendor, first",
    subtitle: "See what's genuinely near you before anything else",
  },
];

// Illustrative mockup of the real search UI (SearchHome.tsx) — an example
// interaction, not a claim about a specific real vendor, same convention as
// the old marketing Hero's fictional WhatsApp chat mockup.
function SearchPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.55, ease: "easeOut" }}
      className="relative w-full max-w-md mx-auto"
    >
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xl shadow-gray-200/60 p-4 sm:p-5">
        {/* Search bar */}
        <div className="flex items-center gap-2 bg-[#F1F5F9] rounded-2xl border border-gray-200 px-4 h-12 mb-4">
          <SearchIcon size={16} className="text-gray-400 shrink-0" />
          <span className="text-[14px] text-gray-500 truncate">
            white sneakers, Independence Layout
          </span>
        </div>

        {/* Status line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.4 }}
          className="text-xs text-orange-600 font-medium mb-3 flex items-center gap-1.5"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
          2 vendors found nearby
        </motion.p>

        {/* Result card — mirrors VendorResultCard.tsx exactly */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.35, duration: 0.5 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
        >
          <div className="flex gap-3 p-3">
            <div className="w-16 h-16 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
              <StoreIcon size={20} className="text-gray-300" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-semibold text-gray-800 truncate">
                UrbanFlex White Sneakers
              </p>
              <p className="text-[15px] font-extrabold text-[#023337]">
                ₦28,500
              </p>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <MapPin size={12} className="shrink-0" />
                <span className="truncate">
                  Independence Layout · 0.4km away
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <ShieldCheck size={12} className="shrink-0 text-orange-500" />
                <span>Verified vendor</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Floating badge */}
      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 1.7 }}
        className="absolute -right-3 -top-3 hidden sm:flex items-center gap-2 bg-white border border-orange-200 rounded-xl px-3 py-2 shadow-lg"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-orange-500 shrink-0" />
        <span className="text-[#023337] text-[11px] font-medium whitespace-nowrap">
          From the real catalog
        </span>
      </motion.div>
    </motion.div>
  );
}

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-[#F1F5F9] pt-20 sm:pt-24">
      {/* Soft glows */}
      <div className="absolute top-1/4 left-1/4 w-[420px] h-[420px] bg-orange-400/[0.08] rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-orange-400/[0.06] rounded-full blur-[80px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 pt-8 pb-16 sm:py-16 w-full">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="max-w-3xl mx-auto text-center mb-14"
        >
          <motion.h1
            variants={fadeUp}
            className="text-[2.4rem] sm:text-5xl lg:text-[3.4rem] font-bold text-[#023337] leading-[1.12] tracking-tight mb-5 text-balance"
          >
            Describe what you need.
            <br />
            We find who <span className="text-orange-500">
              actually has it
            </span>{" "}
            — nearby.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-lg text-gray-500 mb-9 leading-relaxed max-w-xl mx-auto"
          >
            Tell us what you&apos;re looking for, in your own words or a photo.
            Velte matches it against real vendor inventory by meaning,
            proximity, and trust — then connects you directly.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row gap-3 justify-center mb-4"
          >
            <Link href="/search">
              <Button
                size="lg"
                className="bg-orange-500 cursor-pointer hover:bg-orange-600 text-white shadow-xl shadow-orange-500/20 text-[15px] px-8 gap-2 h-12 w-full sm:w-auto"
              >
                Try Velte
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button
                size="lg"
                variant="outline"
                className="text-gray-700 cursor-pointer hover:bg-gray-100 text-[15px] h-12 border-gray-300 w-full sm:w-auto"
              >
                List your business
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        <SearchPreview />

        {/* Value strip */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid sm:grid-cols-3 gap-6 sm:gap-4 max-w-4xl mx-auto mt-20"
        >
          {valueProps.map(({ icon: Icon, title, subtitle }) => (
            <motion.div
              key={title}
              variants={fadeUp}
              className="flex flex-col items-center text-center gap-2 px-2"
            >
              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center mb-1">
                <Icon className="w-[18px] h-[18px] text-orange-500" />
              </div>
              <p className="text-sm font-semibold text-[#023337]">{title}</p>
              <p className="text-xs text-gray-500 leading-relaxed max-w-[200px]">
                {subtitle}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
