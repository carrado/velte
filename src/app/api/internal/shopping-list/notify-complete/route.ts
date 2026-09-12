import { NextResponse } from "next/server";

import { appendSearchTurn } from "@/lib/server/searchConversations";
import type { StoredSearchTurn } from "@/types/search";

// Shopping Lists (2026-09-12) — the completion counterpart to
// /api/shopping-list/start's "I've started looking…" append. Called by
// velte-backend's own always-on sweep (jobs/shoppingListJob.job.js) the
// moment a job finishes, same service-to-service pattern and same shared
// secret as /api/internal/shopping-list/search-item.
//
// A SUMMARY only, deliberately — never the actual results. Those stay at
// the dedicated /chat/shopping-list/[jobId] route (see
// ShoppingListResultsView's own header on why); this just lets the buyer
// see, right there in the conversation they started it from, that the wait
// is over and roughly what came of it, without duplicating vendor/offer
// data into a second place that could drift from the job document.
//
// Best-effort at BOTH ends: the backend wraps this call the same way it
// already wraps notifyOwner (a failure here costs only this one message,
// never the job's own already-saved status), and this route itself never
// throws past its own try/catch — a staffly-ai-backend hiccup, a
// conversation the buyer has since deleted, or a missing deviceId all just
// mean the append silently doesn't happen.

interface NotifyCompleteBody {
  conversationId?: string | null;
  deviceId?: string | null;
  buyerId?: string | null;
  goalText?: string;
  totalItems?: number;
  foundCount?: number;
  anyFound?: boolean;
}

function summaryMessage(body: NotifyCompleteBody): string {
  const goal = body.goalText?.trim() || "your shopping list";
  const total = body.totalItems ?? 0;
  const found = body.foundCount ?? 0;

  if (body.anyFound) {
    return `Your shopping list search for "${goal}" is done — I found options for ${found} of ${total} item${total === 1 ? "" : "s"}. Open My Shopping Lists to review and pick the best ones.`;
  }
  return `I finished checking your shopping list for "${goal}", but couldn't find a match for any of the ${total} item${total === 1 ? "" : "s"} this time. Take a look at what was checked in My Shopping Lists, or try adjusting the list.`;
}

export async function POST(req: Request) {
  const secret = req.headers.get("x-shopping-list-internal-secret");
  if (
    !process.env.SHOPPING_LIST_INTERNAL_SECRET ||
    secret !== process.env.SHOPPING_LIST_INTERNAL_SECRET
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req
    .json()
    .catch(() => null)) as NotifyCompleteBody | null;
  if (!body?.conversationId || !body?.deviceId) {
    // Nothing to append onto — same "silently skip" tolerance as every
    // other best-effort append in this feature (see file header).
    return NextResponse.json({ appended: false });
  }

  try {
    const turn: StoredSearchTurn = {
      query: "",
      imageUrl: null,
      reply: summaryMessage(body),
      toolCalled: false,
      clarification: null,
      backgroundClarifyItem: null,
      products: [],
      weakProducts: [],
      stores: [],
      furtherStores: [],
      storesQuery: null,
      productStores: [],
      storeServices: [],
      productsMatchTier: null,
      storesMatchTier: null,
      productsMatchQuality: undefined,
      storesMatchQuality: undefined,
      externalStoreSuggestions: [],
      vendorProducts: [],
      vendorProductsStore: null,
      buyerRequestOffer: null,
      buyerRequestOffered: false,
      interimReplies: [],
      awaitingBuyerRequestReply: false,
      buyerRequestMatchQuery: null,
      contextNote: null,
      recommendation: null,
      externalOffers: [],
      awaitingComparisonPurchaseReply: false,
      comparisonPickItem: null,
      shoppingList: null,
      knownBudgetNaira: null,
    };
    await appendSearchTurn({
      conversationId: body.conversationId,
      deviceId: body.deviceId,
      buyerId: body.buyerId ?? null,
      turn,
    });
    return NextResponse.json({ appended: true });
  } catch (err) {
    console.warn(
      "[shopping-list] couldn't persist the completion summary (non-fatal):",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ appended: false });
  }
}
