import { NextResponse } from "next/server";

import { AiSearchBackendError } from "@/lib/server/aiSearchBackend";
import { listSearchConversations } from "@/lib/server/searchConversations";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { getOptionalVendorAuth, jsonError } from "@/lib/server/guards";

// GET /api/search/conversations — the signed-in buyer's OR vendor's chat
// history, newest first, for the sidebar they pick a thread from
// (2026-08-26, widened 2026-09-17 for a vendor with no linked buyer
// account — see ConversationSidebar's own `identity` note). Opening one
// still goes through /api/search/conversation?id=, which returns the real
// turn snapshots; this only produces the rows.
//
// Guarded, unlike every other route under /api/search: those stay public
// because search itself is anonymous and a conversation is owned by an
// unguessable deviceId. A HISTORY has no such token — it's "everything
// belonging to this person" — so the buyerId/vendorId can only ever come
// from a verified session here, never from a query parameter a caller
// supplies.
//
// BOTH identities when both cookies exist (2026-09-23). From 2026-09-22 to
// today this was vendor-only, which fixed the header and sidebar disagreeing
// about who "you" are — but a linked account's history is split across the
// two ids (threads from while it resolved as the buyer carry buyerId, later
// ones vendorId), so listing one hid the other half. The backend now matches
// a thread owned by either. Same both-ids rule /api/search/conversation
// already uses to OPEN a thread; the two cookies are paired or cleared
// together at every login, so both being present means one person.
export async function GET(req: Request) {
  const vendorAuth = await getOptionalVendorAuth();
  const buyerAuth = await getOptionalBuyerAuth();
  if (!buyerAuth && !vendorAuth) {
    return jsonError(401, "Sign in to view your conversations.");
  }

  const { searchParams } = new URL(req.url);
  const rawLimit = Number.parseInt(searchParams.get("limit") ?? "", 10);
  const before = searchParams.get("before");

  try {
    // No retention window any more (2026-08-31). It existed to enforce
    // `Plan.historyDays`, a tier differentiator, and the tiers are gone —
    // under credits you pay for ACTIONS, not for how long Velte remembers
    // what you asked. Everyone keeps everything, which is also the only
    // version of this a buyer would ever have to think about.
    const list = await listSearchConversations({
      buyerId: buyerAuth?.buyerId ?? null,
      vendorId: vendorAuth?.userId ?? null,
      limit: Number.isInteger(rawLimit) && rawLimit > 0 ? rawLimit : undefined,
      before,
    });
    return NextResponse.json(list);
  } catch (err) {
    if (err instanceof AiSearchBackendError && err.status < 500) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[search/conversations] list failed:", err);
    return NextResponse.json(
      { error: "Couldn't load your conversations." },
      { status: 502 },
    );
  }
}
