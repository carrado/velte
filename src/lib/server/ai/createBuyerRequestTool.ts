import { tool } from "ai";
import { z } from "zod";

import { backendData } from "@/lib/server/backend";
import type { BuyerRequestToolOutcome } from "@/types/search";

const inputSchema = z.object({
  description: z
    .string()
    .min(5)
    .describe(
      "A complete, self-contained summary of what the buyer needs, written the way THEY would describe it to a business — combine everything relevant said across this whole conversation (the item/service, quantity, budget, date/timeframe, location, and any other detail already given). A vendor reads only this text, not the rest of the chat, so it must stand entirely on its own.",
    ),
  buyerName: z
    .string()
    .min(2)
    .describe(
      "The buyer's own name, exactly as they gave it earlier in THIS conversation when you asked for it. Never invent or guess one — you must have already asked and gotten a real answer before ever calling this tool.",
    ),
});

/**
 * The AI-agent replacement for a standalone "Post a Request" page
 * (2026-08-15 pivot) — the model calls this ITSELF, mid-conversation, once
 * a real search this turn or an earlier one already came up with nothing
 * useful AND the buyer has explicitly agreed to have Velte reach out to
 * businesses on their behalf (see systemPrompt.ts's own rule on when this
 * is allowed), AND has given their name (also systemPrompt.ts). The buyer
 * never sees a form or a "Post a Request" button — from their side this is
 * just Velte continuing the conversation.
 *
 * Identity is the one thing a tool call can't settle mid-execute() — it
 * needs a live phone/OTP round-trip, or at minimum the buyer confirming
 * which number to use, and only the browser can do either. So this tool
 * NEVER creates the request itself. It decides which of three things the
 * frontend must collect and returns that:
 *
 *   needs_signin       — no session at all: sign in with Google, which then
 *                        continues into the phone step below (2026-08-29 —
 *                        an account is now a precondition for posting a
 *                        request, not an alternative to one).
 *   needs_identity     — a session whose account has no verified phone yet:
 *                        the inline phone + OTP capture.
 *   needs_phone_choice — a session whose account already has a verified
 *                        phone: show it back and let them use it or give
 *                        another (2026-08-26, per explicit product
 *                        direction).
 *
 * Either way SearchHome creates the request via a plain POST
 * /api/buyer-requests with this same `description`/`buyerName` — no second
 * AI turn required for that part.
 */
// Signature narrowed to `buyerAuth` alone (2026-08-26). It used to take
// buyerLocation / imageUrl / push / matchQuery because it CREATED the
// request itself; it no longer creates anything — the phone has to be
// confirmed first, and only the browser can do that — so those all belong
// to the frontend's own POST /api/buyer-requests, which already sends them.
export function createBuyerRequestTool(
  buyerAuth: { buyerId: string; cookie: string } | null,
) {
  return tool({
    description:
      "Send the buyer's need to real businesses on Velte, when a search THIS conversation already ran came back with nothing useful AND the buyer has just explicitly agreed (a clear yes/go-ahead) to an offer YOU already made, in an earlier turn, to reach out to businesses on their behalf, AND you already know their name (ask for it first if you don't — see this tool's own rule). Never call this before making that offer and getting agreement — asking first is mandatory, not optional. Never call this in the same turn as searchProducts/searchStores/getVendorProducts. Never call this for a request you haven't tried a real search for yet — always try searchProducts/searchStores first.",
    inputSchema,
    execute: async ({
      description,
      buyerName,
    }): Promise<BuyerRequestToolOutcome> => {
      // No account at all — sign-up comes FIRST now (2026-08-29, per
      // explicit product direction). This used to return "needs_identity",
      // sending a stranger straight into phone + OTP and creating the
      // request off a bare proof-of-number with no account behind it. That
      // path is gone on the backend too: POST /buyer-requests requires a
      // session, and the OTP endpoints are behind one as well.
      if (!buyerAuth) {
        return { status: "needs_signin", description, buyerName };
      }

      // A session alone isn't enough any more (2026-08-26). A buyer signed
      // in with Google may have no phone at all, and one who does should be
      // shown it rather than have it silently reused — a vendor replies on
      // WhatsApp, so the wrong number is a dead lead the buyer never hears
      // about. Both cases hand the turn to the frontend's own capture UI
      // instead of creating anything here.
      //
      // Read from /buyer-auth/me rather than carried on the session: the
      // JWT holds only a buyerId, and a phone verified two turns ago
      // wouldn't be in a token minted before it. One extra call, only on
      // this path, which runs at most once per conversation.
      let savedPhone: string | null = null;
      try {
        const { buyer } = await backendData<{
          buyer: { phone: string | null; phoneVerified: boolean };
        }>("/buyer-auth/me", { cookie: buyerAuth.cookie });
        if (buyer?.phoneVerified && buyer.phone) savedPhone = buyer.phone;
      } catch (err) {
        // Never fatal: falling through to needs_identity asks for a number,
        // which is the safe outcome — worst case the buyer re-verifies one
        // they had already given.
        console.error("[createBuyerRequest] phone lookup failed:", err);
      }
      if (!savedPhone) {
        return { status: "needs_identity", description, buyerName };
      }
      return {
        status: "needs_phone_choice",
        description,
        buyerName,
        phone: savedPhone,
      };
    },
  });
}
