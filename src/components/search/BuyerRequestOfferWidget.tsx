"use client";

import { useState } from "react";
import { toast } from "sonner";
import { buyerApi } from "@/lib/buyer-api-client";
import { BuyerPhoneVerifyForm } from "@/components/buyer/BuyerPhoneVerifyForm";
import type { BuyerLocation, BuyerRequestOffer } from "@/types/search";
import { CheckCircleIcon } from "@/components/icons";

/* Renders createBuyerRequestTool's outcome (see BuyerRequestOffer's own
   comment) — the AI-agent replacement for the old standalone "Post a
   Request" page. Sits below the turn's reply text, same slot
   ClarificationPrompt uses, only actionable while isLatest (see
   SearchHome.tsx).

   "created"/"error" are plain confirmations. "needs_identity" is the
   interesting case: an inline phone+OTP exchange (BuyerPhoneVerifyForm,
   "compact" variant), deliberately staying INSIDE the chat rather than
   navigating anywhere — the whole point of the agent pivot is that the
   buyer never leaves the conversation to "register." Phone+OTP only, no
   email/password (see buyerAuth.controller.js's verify-otp) — asking for
   more here would break the "still talking to Velte" feel. Once verified,
   this creates the request itself via a plain POST /api/buyer-requests
   using the tool's own `description` — no second AI turn needed for that
   part. */
export function BuyerRequestOfferWidget({
  offer,
  imageUrl,
  location,
  onResolved,
}: {
  offer: BuyerRequestOffer;
  imageUrl: string | null;
  /** The buyer's device location, if they granted it earlier this session —
   *  used only for THIS request, never saved anywhere (see createRequest's
   *  own comment). Omitted entirely when not granted, so the vendor sees
   *  "N/A" rather than a guess. */
  location?: BuyerLocation;
  onResolved: (offer: BuyerRequestOffer) => void;
}) {
  const [creating, setCreating] = useState(false);
  // True only when THIS widget is what discovered "no_match" — after the
  // buyer verified their phone (handleVerified below), a plain REST call,
  // no AI turn involved, so `turn.reply` above still just says the old
  // "I'll text you when someone responds" line and never mentions the
  // outcome. Distinguishes that from a `no_match` arriving straight from
  // the server-side tool call (an already-identified buyer's agreement
  // turn), where the model's own reply text already explained it in full
  // (see systemPrompt.ts's `no_match` handling, which re-searches and shows
  // Google Places in that same turn) — rendering this component's own text
  // there too would just repeat what the buyer already read above.
  const [selfResolvedNoMatch, setSelfResolvedNoMatch] = useState(false);

  if (offer.status === "created") {
    return (
      // No max-w here (deliberately) — a fixed cap made this confirmation
      // the one message on the page with its own narrower column than
      // everything around it. It's still a status card, not a plain reply,
      // so it keeps its bg/border, just sized to the same width as
      // everything else in the thread instead of a bespoke one.
      <div className="flex items-start gap-2.5 bg-green-50 border border-green-100 rounded-2xl px-4 py-3">
        <CheckCircleIcon size={17} className="text-green-600 shrink-0 mt-0.5" />
        <div className="text-sm text-green-800">
          <p className="font-medium">Request sent.</p>
          <p className="text-green-700/80">
            You&apos;ll get an SMS confirming this, and any interested vendor
            will message you directly on WhatsApp.
          </p>
        </div>
      </div>
    );
  }

  if (offer.status === "no_match") {
    // Only render something when THIS widget is the one that found out (see
    // selfResolvedNoMatch's own comment) — otherwise the turn's own reply
    // above already said it, and this would just repeat it. A plain
    // message, not a card, same reasoning as every other pure-text reply in
    // this thread. No auto-retry here: rather than silently resending the
    // buyer's own words as a synthetic message (risking the AI re-offering
    // the exact same reach-out in a loop), this stays honest and hands
    // control back — the always-visible composer below is already the
    // "search again" path.
    if (!selfResolvedNoMatch) return null;
    return (
      <p className="text-sm text-gray-500">
        Couldn&apos;t find any businesses to reach out to for that just now —
        new vendors join often, so it&apos;s worth trying again later.
      </p>
    );
  }

  if (offer.status === "error") {
    // The model's own reply above already apologizes and offers to retry
    // (see systemPrompt.ts's `status: "error"` handling) — a second, red
    // "couldn't send" line repeating that in a different voice/color read
    // as a broken, inconsistent UI rather than one assistant talking.
    // Nothing further to render here.
    return null;
  }

  async function handleVerified() {
    // Only ever reachable from the JSX below, which only renders once
    // `offer.status` has fallen through to "needs_identity" — but that
    // narrowing doesn't persist into this separate function, so re-check
    // explicitly rather than fight TypeScript with a cast.
    if (offer.status !== "needs_identity") return;
    setCreating(true);
    try {
      const { created, request } = await buyerApi.post<{
        created: boolean;
        request: { id: string } | null;
      }>("/api/buyer-requests", {
        description: offer.description,
        name: offer.buyerName,
        imageUrl: imageUrl ?? null,
        ...(location && { location }),
      });
      if (!created || !request) {
        setSelfResolvedNoMatch(true);
        onResolved({ status: "no_match", description: offer.description });
        return;
      }
      onResolved({
        status: "created",
        requestId: request.id,
        description: offer.description,
      });
      toast.success("Request sent 🎉");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-orange-200 p-4 max-w-sm space-y-3">
      <fieldset disabled={creating} className="contents">
        <BuyerPhoneVerifyForm
          variant="compact"
          promptLabel="What's your WhatsApp number? That's how a vendor will reach you."
          onVerified={handleVerified}
        />
      </fieldset>
    </div>
  );
}
