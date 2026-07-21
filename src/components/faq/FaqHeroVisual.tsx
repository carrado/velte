"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import ShineSweep from "@/components/ShineSweep";
import type { FaqTabKey } from "./FaqTabs";
import type { FaqSectionImage } from "@/types/common";

// Photo credits — Unsplash's license doesn't require attribution, kept here
// for maintainability.
const buyerImage: FaqSectionImage = {
  src: "https://images.unsplash.com/photo-1751276651723-3b9b000ce37d",
  alt: "Woman looking into a storefront in Lagos, Nigeria",
  credit: "Michael Umoh (unsplash.com/photos/o1reZpaQ7NM)",
};
const vendorImage: FaqSectionImage = {
  src: "https://images.unsplash.com/photo-1761370571873-5d869310d731",
  alt: "Woman inside her clothing store, Abuja, Nigeria",
  credit: "Muhammad-Taha Ibrahim (unsplash.com/photos/zoWuHiPJYHc)",
};

const captions: Record<
  Exclude<FaqTabKey, "all">,
  { title: string; sub: string }
> = {
  buyer: {
    title: "Real vendors, real stores",
    sub: "Every result on Velte comes from an actual business nearby",
  },
  vendor: {
    title: "Get discovered nearby",
    sub: "Buyers matched to your store by meaning, distance & trust",
  },
};

export default function FaqHeroVisual({ tab }: { tab: FaqTabKey }) {
  return (
    <div className="relative h-64 sm:h-80 lg:h-[420px] mt-2 lg:mt-0">
      <AnimatePresence mode="wait">
        {tab === "all" ? (
          <motion.div
            key="all"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0"
          >
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-0 left-0 w-[68%] aspect-[4/5] rounded-3xl overflow-hidden shadow-xl shadow-gray-400/30 -rotate-3"
            >
              <Image
                src={buyerImage.src}
                alt={buyerImage.alt}
                fill
                sizes="(min-width: 1024px) 340px, 60vw"
                quality={90}
                priority
                className="object-cover"
              />
              <ShineSweep />
            </motion.div>

            <motion.div
              animate={{ y: [0, 14, 0] }}
              transition={{
                duration: 7,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.6,
              }}
              className="absolute bottom-0 right-0 w-[58%] aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl shadow-gray-400/40 rotate-3 border-4 border-[#F1F5F9]"
            >
              <Image
                src={vendorImage.src}
                alt={vendorImage.alt}
                fill
                sizes="(min-width: 1024px) 300px, 50vw"
                quality={90}
                className="object-cover"
              />
              <ShineSweep />
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: 30, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -30, scale: 0.96 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="relative w-full h-full rounded-3xl overflow-hidden shadow-xl shadow-gray-400/30"
            >
              <Image
                src={tab === "buyer" ? buyerImage.src : vendorImage.src}
                alt={tab === "buyer" ? buyerImage.alt : vendorImage.alt}
                fill
                sizes="420px"
                quality={90}
                priority
                className="object-cover"
              />
              <ShineSweep />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <p className="text-white text-sm font-semibold">
                  {captions[tab].title}
                </p>
                <p className="text-white/70 text-xs mt-0.5">
                  {captions[tab].sub}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
