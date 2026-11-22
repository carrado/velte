"use client";

import { useState } from "react";
import Link from "next/link";
import { VelteLogo } from "@/components/VelteLogo";
import { motion, AnimatePresence } from "motion/react";
import { BuyerAuthShell } from "@/components/buyer/BuyerAuthShell";
import type { AuthPanelContent, IconComponent } from "@/types/common";
import {
  TrendUp,
  Storefront,
  Wallet,
  ShoppingBag,
  MapPin,
  Lock,
} from "@phosphor-icons/react";
import RolePicker from "./_components/RolePicker";
import BuyerSignupPanel from "./_components/BuyerSignupPanel";
import VendorSignupForm from "./_components/VendorSignupForm";

type Role = "buyer" | "vendor" | null;

/* Panel content switches as the user picks a role */
const ROLE_PANEL: Record<NonNullable<Role>, AuthPanelContent> = {
  vendor: {
    headline: "Get discovered by buyers who are already looking.",
    subtitle:
      "List your business once — Velte matches you against real buyer demand by meaning, proximity and trust.",
    features: [
      {
        icon: TrendUp as unknown as IconComponent,
        text: "Real buyer demand, not cold outreach",
      },
      {
        icon: Storefront as unknown as IconComponent,
        text: "A storefront buyers can trust at a glance",
      },
      {
        icon: Wallet as unknown as IconComponent,
        text: "Paid straight to your bank — funds never sit with us",
      },
    ],
  },
  buyer: {
    headline: "Describe what you need. Nearby vendors find you.",
    subtitle:
      "Velte matches your request against real vendors near you — no scrolling through irrelevant listings.",
    features: [
      {
        icon: ShoppingBag as unknown as IconComponent,
        text: "Post what you need, vendors who have it respond",
      },
      {
        icon: MapPin as unknown as IconComponent,
        text: "Matched by what's actually near you",
      },
      {
        icon: Lock as unknown as IconComponent,
        text: "No spam — you pick who to chat with",
      },
    ],
  },
};

const DEFAULT_PANEL: AuthPanelContent = {
  headline: "Join thousands of buyers and vendors on Velte.",
  subtitle:
    "Whether you're running a business or looking for one — Velte brings you together.",
  features: [
    {
      icon: Storefront as unknown as IconComponent,
      text: "Thousands of verified vendors near you",
    },
    {
      icon: ShoppingBag as unknown as IconComponent,
      text: "Shop local, support local businesses",
    },
    {
      icon: Lock as unknown as IconComponent,
      text: "Your data stays private, always",
    },
  ],
};

export default function SignupPage() {
  const [role, setRole] = useState<Role>(null);

  const panel = role ? ROLE_PANEL[role] : DEFAULT_PANEL;

  return (
    <BuyerAuthShell panel={panel}>
      <AnimatePresence mode="wait">
        {role === null && (
          <motion.div
            key="picker"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-[520px]"
          >
            {/* Mobile logo */}
            <Link
              href="/"
              className="flex items-center gap-2.5 justify-center mb-6 lg:hidden"
            >
              <VelteLogo alt="Velte logo" width={72} height={35} priority />
            </Link>

            <RolePicker onSelect={(r) => setRole(r)} />

            <p className="text-center text-gray-400 text-sm mt-5">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="text-orange-600 hover:text-orange-700 font-medium"
              >
                Sign in
              </Link>
            </p>
          </motion.div>
        )}

        {role === "buyer" && (
          <motion.div
            key="buyer"
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 32 }}
            transition={{ duration: 0.3 }}
            className="w-full flex flex-col items-center"
          >
            {/* Mobile logo */}
            <Link
              href="/"
              className="flex items-center gap-2.5 justify-center mb-6 lg:hidden"
            >
              <VelteLogo alt="Velte logo" width={72} height={35} priority />
            </Link>

            <BuyerSignupPanel onBack={() => setRole(null)} />

            <p className="text-center text-gray-400 text-sm mt-5">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="text-orange-600 hover:text-orange-700 font-medium"
              >
                Sign in
              </Link>
            </p>
          </motion.div>
        )}

        {role === "vendor" && (
          <motion.div
            key="vendor"
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 32 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-[640px]"
          >
            {/* Mobile logo */}
            <Link
              href="/"
              className="flex items-center gap-2.5 justify-center mb-6 lg:hidden"
            >
              <VelteLogo alt="Velte logo" width={72} height={35} priority />
            </Link>

            <div className="bg-surface border border-gray-100 sm:rounded-2xl p-8 shadow-md shadow-black/5">
              {/* Back + role badge */}
              <div className="flex items-center gap-3 mb-7">
                <button
                  onClick={() => setRole(null)}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 cursor-pointer transition-colors shrink-0"
                >
                  ← Back
                </button>
                <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-100 text-orange-500 text-xs font-semibold px-3 py-1 rounded-full">
                  Vendor account
                </div>
              </div>

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
        )}
      </AnimatePresence>
    </BuyerAuthShell>
  );
}
