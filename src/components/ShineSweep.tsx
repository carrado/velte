"use client";

import { motion } from "motion/react";

// Diagonal light-sweep overlay for photo cards — a subtle animated shine
// that loops with a pause between passes. Used across marketing photo
// treatments (FAQ hero visual, homepage Hero/VendorPitch).
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
