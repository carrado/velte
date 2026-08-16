import { tool } from "ai";
import { z } from "zod";

import { backendData } from "@/lib/server/backend";
import { sendingRequestPhrase } from "@/lib/server/ai/statusPhrases";
import type { BuyerLocation, BuyerRequestOffer } from "@/types/search";

const inputSchema = z.object({
  description: z
    .string()
    .min(5)
    .describe(
      "A complete, self-contained summary of what the buyer needs, written the way THEY would describe it to a business — combine everything relevant said across this whole conversation (the item/service, quantity, budget, date/timeframe, location, and any other detail already given). A vendor reads only this text, not the rest of the chat, so it must stand entirely on its own.",
    ),
});

/**
 * The AI-agent replacement for a standalone "Post a Request" page
 * (2026-08-15 pivot) — the model calls this ITSELF, mid-conversation, once
 * a real search this turn or an earlier one already came up with nothing
 * useful AND the buyer has explicitly agreed to have Velte reach out to
 * businesses on their behalf (see systemPrompt.ts's own rule on when this
 * is allowed). The buyer never sees a form or a "Post a Request" button —
 * from their side this is just Velte continuing the conversation.
 *
 * Identity is the one thing a tool call can't collect mid-execute() (it
 * needs a phone number + a live OTP round-trip, which only the browser can
 * do) — so when no buyer session exists yet, this returns `needs_identity`
 * WITHOUT creating anything, and the frontend (BuyerRequestOfferWidget)
 * takes over: it renders an inline phone+OTP capture, and once verified,
 * creates the request itself via a plain POST /api/buyer-requests using
 * this same `description` — no second AI turn required for that part.
 */
export function createBuyerRequestTool(
  buyerAuth: { buyerId: string; cookie: string } | null,
  buyerLocation: BuyerLocation | undefined,
  imageUrl: string | undefined,
  push?: (candidates: string[]) => void,
) {
  return tool({
    description:
      "Send the buyer's need to real businesses on Velte, when a search THIS conversation already ran came back with nothing useful AND the buyer has just explicitly agreed (a clear yes/go-ahead) to an offer YOU already made, in an earlier turn, to reach out to businesses on their behalf. Never call this before making that offer and getting agreement — asking first is mandatory, not optional. Never call this in the same turn as searchProducts/searchStores/getVendorProducts. Never call this for a request you haven't tried a real search for yet — always try searchProducts/searchStores first.",
    inputSchema,
    execute: async ({ description }): Promise<BuyerRequestOffer> => {
      if (!buyerAuth) {
        return { status: "needs_identity", description };
      }
      push?.(sendingRequestPhrase());
      try {
        const { request } = await backendData<{ request: { id: string } }>(
          "/buyer-requests",
          {
            method: "POST",
            cookie: buyerAuth.cookie,
            body: {
              description,
              imageUrl: imageUrl ?? null,
              ...(buyerLocation && { location: buyerLocation }),
            },
          },
        );
        return { status: "created", description, requestId: request.id };
      } catch (err) {
        console.error("[createBuyerRequest] failed:", err);
        return { status: "error", description };
      }
    },
  });
}
