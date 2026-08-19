"use client";

import { CheckCircleIcon } from "@/components/icons";
import type { BuyerRequestOffer } from "@/types/search";

/* Renders createBuyerRequestTool's outcome (see BuyerRequestOffer's own
   comment) — the AI-agent replacement for the old standalone "Post a
   Request" page. Sits below the turn's reply text, same slot
   ClarificationPrompt uses, only actionable while isLatest (see
   SearchHome.tsx). "created" is the one case with anything to render — a
   plain green confirmation card.

   `offer.status` is deliberately never "needs_identity" here (2026-08-19
   redesign — see IdentityCapture, types/search.ts): that case used to be
   this component's own job, an inline phone+OTP exchange
   (BuyerPhoneVerifyForm, "compact" variant). It's now SearchHome.tsx's own
   composer instead — the buyer types their number/code straight into the
   SAME composer as everything else, narrated as ordinary follow-up turns,
   never a separate form widget dropped into the thread. SearchHome.tsx's
   own render gate never passes a "needs_identity" offer down to this
   component anymore.

   "no_match"/"error" render nothing here either (2026-08-19, same pass —
   this used to also self-resolve a "no AI turn ran for this" no_match via
   its own deterministic /api/buyer-requests/nearby fetch, back when THIS
   widget owned the whole identity-capture exchange; SearchHome.tsx's own
   handleIdentitySubmit does that fetch itself now, directly on the turn,
   before this component is ever involved). The remaining path that can
   still reach "no_match"/"error" here is the ORDINARY /api/search
   pipeline, an already-identified buyer's agreement turn — the model's
   own reply text (buyerRequestStatusReply, route.ts) already explains
   that outcome in full above this widget, so rendering anything here too
   would just repeat it. */
export function BuyerRequestOfferWidget({
  offer,
}: {
  offer: Exclude<BuyerRequestOffer, { status: "needs_identity" }>;
}) {
  if (offer.status !== "created") return null;
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
          You&apos;ll get an SMS confirming this, and any interested vendor will
          message you directly on WhatsApp.
        </p>
      </div>
    </div>
  );
}
