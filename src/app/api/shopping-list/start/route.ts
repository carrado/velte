import { NextResponse } from "next/server";

import { requireBuyerAuth } from "@/lib/server/buyerGuards";
import { backendData, BackendError } from "@/lib/server/backend";
import { appendSearchTurn } from "@/lib/server/searchConversations";
import { CREDIT_COST } from "@/lib/credits";
import type {
  ShoppingListItemEstimate,
  StoredSearchTurn,
} from "@/types/search";

// Shopping Lists (2026-09-12) — "Get these items". Creates the durable
// background job on velte-backend (src/jobs/shoppingListJob.job.js does the
// actual work, a setInterval sweep in that always-on process — see this
// route's own header comment there for why the job does NOT live here as a
// Next.js `after()` callback) and appends the plain "I've started
// looking…" message onto the CURRENT conversation. That append is safe —
// unlike appending a finished job's RESULTS minutes/hours later into a
// conversation the buyer may have long since left (see
// ShoppingListResultsView's own comment on why those render at a dedicated
// route instead) — because this happens synchronously, in the same live
// session, onto the conversation the buyer is looking at right now.
//
// Buyer-owned, deliberately requireBuyerAuth (not the optional guard most
// of /api/search uses): a guest has no row a background job could be
// billed against or a notification delivered to, so this simply isn't
// offered to one.

interface StartBody {
  goalText?: string;
  items?: ShoppingListItemEstimate[];
  budgetNaira?: number | null;
  conversationId?: string;
  deviceId?: string;
  clientRef?: string;
}

function startedMessage(): string {
  return "I've started looking for the items on your shopping list. I'll check Velte vendors first, then other available sources, and let you know the moment I have results.";
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as StartBody | null;
  if (
    !body?.goalText?.trim() ||
    !Array.isArray(body.items) ||
    !body.items.length ||
    !body.deviceId ||
    !body.clientRef
  ) {
    return NextResponse.json(
      { error: "goalText, items, deviceId and clientRef are required." },
      { status: 400 },
    );
  }

  const auth = await requireBuyerAuth();
  if ("response" in auth) return auth.response;

  // Checked against the FULL ceiling — every item this job could ever bill
  // for — rather than one item's cost, so refusing here means nothing is
  // ever started that can't be paid through to completion. Read directly
  // rather than via affordCredits/chargeCredits (lib/server/creditLedger.ts):
  // those check ONE action's fixed cost, with no quantity to multiply by,
  // and this codebase has already been through adding, then deliberately
  // removing, a per-call cost override on those shared functions — this
  // stays a small, local check instead of reopening that. Fails OPEN on a
  // read error, same direction as every other credit gate here: a ledger
  // outage must never look like an outage of Velte.
  const ceiling = CREDIT_COST.shopping_list_item * body.items.length;
  try {
    const { balance } = await backendData<{ balance: number }>("/credits", {
      cookie: auth.cookie,
    });
    if (balance < ceiling) {
      return NextResponse.json(
        {
          error: `This list needs up to ${ceiling} credits to search — you have ${balance}. Top up to continue.`,
        },
        { status: 402 },
      );
    }
  } catch (err) {
    console.warn(
      "[shopping-list] balance check unavailable, allowing (fail open):",
      err instanceof Error ? err.message : err,
    );
  }

  let jobId: string;
  try {
    const { job } = await backendData<{ job: { id: string } }>(
      "/shopping-list-jobs",
      {
        method: "POST",
        cookie: auth.cookie,
        body: {
          goalText: body.goalText,
          items: body.items,
          budgetNaira: body.budgetNaira ?? null,
          conversationId: body.conversationId ?? null,
          deviceId: body.deviceId,
          clientRef: body.clientRef,
        },
      },
    );
    jobId = job.id;
  } catch (err) {
    if (err instanceof BackendError && err.status < 500) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[shopping-list] job creation failed:", err);
    return NextResponse.json(
      { error: "Couldn't start that search — try again." },
      { status: 502 },
    );
  }

  const message = startedMessage();

  // Best-effort, same tolerance as every other appendSearchTurn call site —
  // the buyer already has their job started and their jobId back; a
  // persistence hiccup here costs only this one message not showing up in
  // scrollback on a refresh, never the search itself.
  if (body.conversationId) {
    try {
      const turn: StoredSearchTurn = {
        query: "",
        imageUrl: null,
        reply: message,
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
        buyerId: auth.buyerId,
        turn,
      });
    } catch (err) {
      console.warn(
        "[shopping-list] couldn't persist the start message (non-fatal):",
        err instanceof Error ? err.message : err,
      );
    }
  }

  return NextResponse.json({ jobId, message });
}
