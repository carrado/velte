"use client";

import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { MapPin, MessageSquarePlus, ShieldCheck } from "lucide-react";

import { BuyerAuthShell } from "@/components/buyer/BuyerAuthShell";
import { BuyerPhoneVerifyForm } from "@/components/buyer/BuyerPhoneVerifyForm";
import type { AuthPanelContent } from "@/types/common";

/* The buyer's ONLY identity screen (2026-08-16, replacing the old
   redirect-into-/auth/login shim — see git history on this file for that
   version's own comment). Every buyer-facing 401 in the app already points
   here (requests/new's createMutation.onError, useSavedItems' toggleMutation
   .onError, and the plain "log in to see this" links on the Saved/Requests/
   Profile dashboard pages) via `/buyer/auth?redirect=...&reason=...` — none
   of those call sites needed to change, only what this URL actually renders.

   No email/password, no name field, no "log in vs sign up" choice — phone +
   OTP (BuyerPhoneVerifyForm) is the whole account. Verifying either creates
   or resumes a buyer silently; there's no meaningful difference between the
   two from here. `reason` only changes the prompt copy so the ask always
   ties back to something the buyer can see the point of, never a bare
   "enter your phone number." */

const PANEL: AuthPanelContent = {
  headline: "One number. That's the whole account.",
  subtitle:
    "No password to set, nothing to remember — your phone number is how Velte knows it's you, on this visit and the next.",
  features: [
    {
      icon: MessageSquarePlus,
      text: "Post what you need, vendors who have it respond",
    },
    { icon: MapPin, text: "Matched by what's actually near you" },
    { icon: ShieldCheck, text: "No spam — you pick who to chat with" },
  ],
};

function promptFor(reason: string | null): string {
  switch (reason) {
    case "request":
      return "What's your number so we can let you know when a vendor responds?";
    case "save":
      return "What's your number? We'll remember this for you.";
    default:
      return "Enter your phone number to continue.";
  }
}

function BuyerAuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/buyer";
  const reason = searchParams.get("reason");

  function handleVerified() {
    // .replace(), not .push() — same reasoning as the vendor login flow
    // (LoginForm.tsx): this screen shouldn't stay one back-press away once
    // the buyer's actually in.
    router.replace(redirectTo);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-[440px]"
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
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-[#023337] mb-2 tracking-tight">
            Almost there
          </h1>
          <p className="text-gray-500 text-sm">
            Just your phone number — no password, nothing else to fill in.
          </p>
        </div>

        <BuyerPhoneVerifyForm
          promptLabel={promptFor(reason)}
          onVerified={handleVerified}
        />
      </div>
    </motion.div>
  );
}

export default function BuyerAuthPage() {
  return (
    <BuyerAuthShell panel={PANEL}>
      <Suspense fallback={null}>
        <BuyerAuthContent />
      </Suspense>
    </BuyerAuthShell>
  );
}
