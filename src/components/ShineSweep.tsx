"use client";

import { motion } from "motion/react";

// Diagonal light-sweep overlay for photo cards — a subtle animated shine
// that loops with a pause between passes. Used across marketing photo
// treatments (FAQ hero visual, About page) — the homepage's own Hero/
// VendorPitch usages were dropped when both were rewritten to no longer
// carry a photo (Hero.tsx 2026-08-13, VendorPitch deleted 2026-08-14).
export default function ShineSweep() {
  return (
    <motion.div
      aria-hidden
      initial={{ x: "-130%" }}
      animate={{ x: "230%" }}
      transition={{
        duration: 2.4,
        repeat: Infinity,
        repeatDelay: 3.2,
        ease: "easeInOut",
      }}
      className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent -skew-x-[20deg] pointer-events-none"
    />
  );
}
