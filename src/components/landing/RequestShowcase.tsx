"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  MapPin,
  MessageSquarePlus,
  ShieldCheck,
} from "lucide-react";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

// A real feature (Buyer Requests, built + matching-pipeline-fixed this
// same week), shown as an illustrative 3-step flow rather than live data —
// a homepage visitor hasn't posted anything yet, so there's no real request
// to show mid-flow. Every label and step mirrors what actually happens
// (see BuyerRequest.model.js / vendorBuyerRequests.controller.js): the
// buyer's own text, a real vendor notified + responding, the buyer picking
// who to chat. Surfaced much earlier/more prominently than before, per the
// brief — this used to be a single small link inside MarketplacePreview's
// button row.
export function RequestShowcase() {
  return (
    <section className="relative bg-[#F1F5F9] border-t border-gray-100 py-14 sm:py-16">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="text-center mb-10"
        >
          <motion.h2
            variants={fadeUp}
            className="text-2xl sm:text-3xl font-bold text-[#023337] tracking-tight mb-2 text-balance"
          >
            Can&apos;t find it? Let vendors find you
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-gray-500 max-w-md mx-auto"
          >
            Post what you need once — vendors who actually have it respond
            directly.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="grid sm:grid-cols-3 gap-5 sm:gap-4 items-start mb-10"
        >
          {/* Step 1 — the request itself */}
          <motion.div variants={fadeUp} className="relative">
            <p className="text-xs font-bold text-orange-500 mb-2.5 pl-1">
              1. You describe it
            </p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-[13px] text-gray-800 leading-relaxed mb-2.5">
                &ldquo;Need 4 ushers for a wedding in Awka this Saturday,
                experience with large events preferred.&rdquo;
              </p>
              <div className="flex items-center gap-1 text-[11px] text-gray-400">
                <MapPin size={11} />
                Awka, Anambra
              </div>
            </div>
          </motion.div>

          {/* Step 2 — vendors respond */}
          <motion.div variants={fadeUp} className="relative">
            <p className="text-xs font-bold text-orange-500 mb-2.5 pl-1">
              2. Nearby vendors respond
            </p>
            <div className="space-y-2">
              {[
                { name: "PrimeEvents Ushers", note: "Available, ₦8,000/usher" },
                { name: "Awka Elite Crew", note: "We do weddings weekly" },
              ].map((v) => (
                <div
                  key={v.name}
                  className="flex items-center gap-2.5 bg-white rounded-xl border border-gray-100 shadow-sm p-3"
                >
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                    <span className="text-[11px] font-bold text-orange-600">
                      {v.name.charAt(0)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-gray-800 truncate flex items-center gap-1">
                      {v.name}
                      <ShieldCheck
                        size={11}
                        className="text-orange-500 shrink-0"
                      />
                    </p>
                    <p className="text-[11px] text-gray-400 truncate">
                      {v.note}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Step 3 — buyer picks */}
          <motion.div variants={fadeUp} className="relative">
            <p className="text-xs font-bold text-orange-500 mb-2.5 pl-1">
              3. You choose who to chat
            </p>
            <div className="bg-white rounded-2xl border border-orange-200 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={15} className="text-green-500 shrink-0" />
                <p className="text-[12px] font-semibold text-gray-800">
                  PrimeEvents Ushers
                </p>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Straight to WhatsApp — you pick who to talk to, never the other
                way around.
              </p>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center"
        >
          <Link
            href="/buyer/requests/new"
            className="inline-flex items-center gap-1.5 px-6 py-3 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-lg shadow-orange-500/20 transition-colors"
          >
            <MessageSquarePlus size={16} />
            Post what you need
            <ArrowRight size={15} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
