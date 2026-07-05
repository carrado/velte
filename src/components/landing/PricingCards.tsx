"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Velte drops subscription tiers for pay-per-lead — there's no fixed
 * plan to show yet (Wallet + lead pricing land later). This is an honest
 * holding placeholder, not a rewritten pricing table.
 */
export default function PricingCards({
  className = "",
  theme = "dark",
}: {
  className?: string;
  theme?: "light" | "dark";
}) {
  const dark = theme === "dark";

  return (
    <div className={className}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45 }}
        className={`max-w-xl mx-auto rounded-2xl p-8 sm:p-10 text-center ${
          dark
            ? "bg-[#0a140d] border border-white/10"
            : "bg-white border border-gray-200 shadow-sm"
        }`}
      >
        <div className="w-12 h-12 rounded-2xl bg-[rgb(247,107,16)]/10 flex items-center justify-center mx-auto mb-5">
          <Sparkles className="w-5 h-5 text-[rgb(247,107,16)]" />
        </div>
        <h3
          className={`text-2xl font-bold tracking-tight mb-3 ${
            dark ? "text-white" : "text-gray-950"
          }`}
        >
          Pricing is changing
        </h3>
        <p
          className={`text-sm leading-relaxed mb-7 ${
            dark ? "text-white/60" : "text-gray-500"
          }`}
        >
          Velte matches buyers to your products by location — no monthly
          subscription. You&apos;ll only pay for the leads you actually get.
          We&apos;re finalising exact pricing as we roll out.
        </p>
        <Link href="/auth/signup">
          <Button className="bg-[rgb(247,107,16)] hover:bg-[rgb(247,107,16)]/90 text-white font-semibold px-8 h-11 shadow-lg shadow-[rgba(247,107,16,0.25)]">
            Get Early Access
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
