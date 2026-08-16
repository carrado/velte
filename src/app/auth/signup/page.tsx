"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { Store, TrendingUp, Wallet } from "lucide-react";

import { BuyerAuthShell } from "@/components/buyer/BuyerAuthShell";
import type { AuthPanelContent } from "@/types/common";
import VendorSignupForm from "./_components/VendorSignupForm";

/* Vendor-only signup (2026-08-15 unified this with a Buyer/Vendor toggle;
   2026-08-16 removed the Buyer side again — see the "why do buyers have to
   sign up" decision). A buyer's account is just a verified phone number,
   created inline the moment it's actually needed (BuyerPhoneVerifyForm, at
   /buyer/auth) — there's no separate buyer form to toggle to here anymore,
   so this page went back to being what /auth/signup always was before the
   brief unification: the vendor registration wizard
   (Step1BusinessAccount/Step2SectorDescription), unchanged. /join still
   redirects here with no type param (see that page's own comment); the old
   /buyer/auth/signup shim now redirects to /buyer/auth instead. */

const VENDOR_PANEL: AuthPanelContent = {
  headline: "Get discovered by buyers who are already looking.",
  subtitle:
    "List your business once — Velte matches you against real buyer demand by meaning, proximity and trust, not just a search box.",
  features: [
    { icon: TrendingUp, text: "Real buyer demand, not cold outreach" },
    { icon: Store, text: "A storefront buyers can trust at a glance" },
    {
      icon: Wallet,
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
