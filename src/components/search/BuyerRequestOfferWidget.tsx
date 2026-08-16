"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

import { buyerApi } from "@/lib/buyer-api-client";
import { BuyerPhoneVerifyForm } from "@/components/buyer/BuyerPhoneVerifyForm";
import type { BuyerRequestOffer } from "@/types/search";

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
  onResolved,
}: {
  offer: BuyerRequestOffer;
  imageUrl: string | null;
  onResolved: (offer: BuyerRequestOffer) => void;
}) {
  const [creating, setCreating] = useState(false);

  if (offer.status === "created") {
    return (
      <div className="flex items-start gap-2.5 bg-green-50 border border-green-100 rounded-2xl px-4 py-3 max-w-md">
        <CheckCircle2 size={17} className="text-green-600 shrink-0 mt-0.5" />
        <div className="text-sm text-green-800">
          <p className="font-medium">Request sent.</p>
          <p className="text-green-700/80">
            I&apos;ll let you know the moment a business responds.{" "}
            <Link
              href={`/buyer/requests/${offer.requestId}`}
              className="underline font-medium"
            >
              View request
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (offer.status === "error") {
    return (
      <p className="text-sm text-red-600">
        Couldn&apos;t send your request just now — say &quot;try again&quot; and
        I&apos;ll give it another go.
      </p>
    );
  }

  async function handleVerified() {
    setCreating(true);
    try {
      const { request } = await buyerApi.post<{ request: { id: string } }>(
        "/api/buyer-requests",
        { description: offer.description, imageUrl: imageUrl ?? null },
      );
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
          promptLabel="What's your number so I can let you know when someone responds?"
          onVerified={handleVerified}
        />
      </fieldset>
    </div>
  );
}
