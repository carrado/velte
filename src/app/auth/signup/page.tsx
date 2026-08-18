"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { BuyerAuthShell } from "@/components/buyer/BuyerAuthShell";
import type { AuthPanelContent } from "@/types/common";
import VendorSignupForm from "./_components/VendorSignupForm";
import { StoreIcon, TrendingUpIcon, WalletIcon } from "@/components/icons";

/* Vendor-only signup. A buyer isn't an account at all (2026-08-18) — just a
   one-time verified phone number, collected inline mid-conversation the
   moment it's actually needed (BuyerPhoneVerifyForm, inside /chat) — there's
   no buyer form to toggle to here. This page is the vendor registration
   wizard (Step1BusinessAccount/Step2SectorDescription). /join still
   redirects here (see that page's own comment). */

const VENDOR_PANEL: AuthPanelContent = {
  headline: "Get discovered by buyers who are already looking.",
  subtitle:
    "List your business once — Velte matches you against real buyer demand by meaning, proximity and trust, not just a search box.",
  features: [
    { icon: TrendingUpIcon, text: "Real buyer demand, not cold outreach" },
    { icon: StoreIcon, text: "A storefront buyers can trust at a glance" },
    {
      icon: WalletIcon,
      text: "Paid straight to your bank — funds never sit with us",
    },
  ],
};

export default function SignupPage() {
  return (
    <BuyerAuthShell panel={VENDOR_PANEL}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[640px]"
      >
        <Link
          href="/"
          className="flex items-center gap-2.5 justify-center mb-6 lg:hidden"
        >
          <Image
            src="/velte_logo_esn5dj.png"
            alt="Velte logo"
            width={72}
            height={35}
            priority
          />
        </Link>

        <div className="bg-white border border-gray-100 sm:rounded-2xl p-8 shadow-xl shadow-gray-200/60">
          <VendorSignupForm />

          <p className="text-center text-gray-400 text-sm mt-6">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-orange-600 hover:text-orange-700 font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </BuyerAuthShell>
  );
}
