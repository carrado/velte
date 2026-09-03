"use client";

import { useCallback, useState } from "react";

import { CheckIcon, CopyIcon } from "@/components/icons";
import { REFERRAL_CREDITS, SIGNUP_CREDITS } from "@/lib/credits";

// The buyer's own referral link (2026-08-31).
//
// Codes were being generated and the grant worked from the day referrals
// shipped, but nothing anywhere showed a buyer their link — a referral
// programme nobody could find, which is a programme that pays out nothing.
// This is the missing half.
//
// It sits in the credits panel next to the balance on purpose. Referrals are
// the only valve in a system with no monthly reset (see REFERRAL_CREDITS), so
// the moment to offer one is the moment someone is looking at how many credits
// they have left — which is exactly when this panel is open.
//
// Renders NOTHING without a code rather than an empty box: buyers created
// before referrals existed have none, and a vendor acting as a buyer has no
// buyer document at all.

/** Built from the CURRENT origin, not a configured base URL. The link has to
 *  work from wherever the app is actually being used — localhost in dev, a
 *  preview deployment, velte.ng in production — and a hardcoded origin would
 *  hand testers a link into production. */
function shareLink(code: string): string {
  if (typeof window === "undefined") return `/chat?ref=${code}`;
  return `${window.location.origin}/chat?ref=${code}`;
}

export function ReferralCard({ code }: { code: string | null }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    if (!code) return;
    const link = shareLink(code);
    void (async () => {
      try {
        // The share sheet first where there is one — on a phone, which is
        // most of Velte, sending a link to WhatsApp is the whole action and
        // the clipboard is a detour through another app.
        if (typeof navigator !== "undefined" && navigator.share) {
          await navigator.share({
            title: "Velte",
            text: `Find what you need from real shops near you. Sign up with my link and we both get credits.`,
            url: link,
          });
          return;
        }
        await navigator.clipboard.writeText(link);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      } catch {
        // A cancelled share sheet and a blocked clipboard land here alike.
        // Neither is worth an error state — the link is on screen and can be
        // selected by hand.
      }
    })();
  }, [code]);

  if (!code) return null;

  return (
    <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-[#023337]">
        Get {REFERRAL_CREDITS} credits for every friend
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
        They get {SIGNUP_CREDITS} free credits when they join, and you get{" "}
        {REFERRAL_CREDITS}.
      </p>
      <div className="mt-3 flex items-stretch gap-2">
        {/* Readable and selectable rather than a bare button: someone typing
            the code into a message by hand has to be able to see it. */}
        <p className="min-w-0 flex-1 truncate rounded-full border border-gray-200 bg-gray-50 px-4 py-2 font-mono text-xs text-gray-600 sm:text-sm">
          {shareLink(code)}
        </p>
        <button
          type="button"
          onClick={copy}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
        >
          {copied ? (
            <CheckIcon size={15} className="shrink-0" />
          ) : (
            <CopyIcon size={15} className="shrink-0" />
          )}
          {copied ? "Copied" : "Share"}
        </button>
      </div>
    </div>
  );
}
