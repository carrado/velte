"use client";

import Image from "next/image";
import { motion } from "motion/react";
import Link from "next/link";
import {
  ArrowRight,
  Gift,
  MapPinned,
  MessageCircle,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ShineSweep from "@/components/ShineSweep";

// AI-generated illustrative vendor portrait (not a real, identifiable
// person) — a Nigerian shop owner behind his counter.
const vendorPhoto = {
  src: "https://res.cloudinary.com/campnet/image/upload/v1784631782/ChatGPT_Image_Jul_21_2026_11_58_25_AM_sk9crg.png",
  alt: "A Nigerian vendor behind the counter of his shop",
};

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
          className="grid lg:grid-cols-[0.85fr_1.15fr] gap-12 lg:gap-16 items-center"
        >
          {/* Photo */}
          <motion.div variants={fadeUp} className="relative">
            <motion.div
              initial={{ rotate: -3 }}
              whileInView={{ rotate: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              whileHover={{ rotate: 1, scale: 1.015 }}
            >
              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="relative aspect-[4/5] lg:aspect-[3/4] rounded-3xl overflow-hidden shadow-xl shadow-gray-300/50"
              >
                <Image
                  src={vendorPhoto.src}
                  alt={vendorPhoto.alt}
                  fill
                  sizes="(min-width: 1024px) 460px, 600px"
                  quality={90}
                  className="object-cover"
                />
                <ShineSweep />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p className="text-white text-sm font-semibold">
                    You list it. Buyers find you.
                  </p>
                  <p className="text-white/70 text-xs mt-0.5">
                    Every vendor on Velte is real — verified and reachable on
                    WhatsApp
                  </p>
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="absolute -right-4 -bottom-4 hidden sm:flex items-center gap-2 bg-white border border-orange-200 rounded-xl px-3 py-2 shadow-lg"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <span className="text-[#023337] text-[11px] font-medium whitespace-nowrap">
                Free to list, always
              </span>
            </motion.div>
          </motion.div>

          {/* Content */}
          <div>
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
                  className="bg-orange-500 cursor-pointer hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 text-[15px] px-7 gap-2 h-12 mb-8 transition-transform hover:scale-[1.03] active:scale-[0.98]"
                >
                  List your business free
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </motion.div>

            <motion.div
              variants={stagger}
              className="grid sm:grid-cols-2 gap-5"
            >
              {benefits.map(({ icon: Icon, title, subtitle }) => (
                <motion.div
                  key={title}
                  variants={fadeUp}
                  whileHover={{ y: -3 }}
                  className="flex items-start gap-3 bg-[#F1F5F9] rounded-2xl border border-gray-200 p-5 transition-shadow duration-200 hover:shadow-md hover:shadow-gray-300/40"
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
          </div>
        </motion.div>
      </div>
    </section>
  );
}
