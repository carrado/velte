"use client";

import { motion } from "motion/react";
import Link from "next/link";
import {
  ArrowRight,
  Gift,
  MapPinned,
  MessageCircle,
  SlidersHorizontal,
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

const benefits = [
  {
    icon: Gift,
    title: "Free to list",
    subtitle: "No listing fees to get discovered",
  },
  {
    icon: MapPinned,
    title: "Matched to real nearby searches",
    subtitle: "Not ads, not bidding — just buyers already looking",
  },
  {
    icon: MessageCircle,
    title: "Buyers reach you directly",
    subtitle: "Straight to your WhatsApp, no middleman",
  },
  {
    icon: SlidersHorizontal,
    title: "You're always in control",
    subtitle: "Update your store and products anytime",
  },
];

export default function VendorPitch() {
  return (
    <section className="relative bg-white border-t border-gray-200 py-20">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-16 items-center"
        >
          <motion.div variants={fadeUp}>
            <span className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-600 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-5 tracking-wide">
              For Vendors
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#023337] leading-[1.15] tracking-tight mb-4 text-balance">
              Buyers are already searching for what you sell
            </h2>
            <p className="text-gray-500 leading-relaxed mb-7 max-w-md">
              Every day, people describe exactly what they need to Velte. List
              your business so the ones near you find you first — no ads, no
              bidding for placement.
            </p>
            <Link href="/auth/signup">
              <Button
                size="lg"
                className="bg-orange-500 cursor-pointer hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 text-[15px] px-7 gap-2 h-12"
              >
                List your business free
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>

          <motion.div variants={stagger} className="grid sm:grid-cols-2 gap-5">
            {benefits.map(({ icon: Icon, title, subtitle }) => (
              <motion.div
                key={title}
                variants={fadeUp}
                className="flex items-start gap-3 bg-[#F1F5F9] rounded-2xl border border-gray-200 p-5"
              >
                <div className="w-9 h-9 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#023337] mb-0.5">
                    {title}
                  </p>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {subtitle}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
