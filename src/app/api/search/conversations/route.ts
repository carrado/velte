import { NextResponse } from "next/server";

import { AiSearchBackendError } from "@/lib/server/aiSearchBackend";
import { listSearchConversations } from "@/lib/server/searchConversations";
import { requireBuyerAuth } from "@/lib/server/buyerGuards";

// GET /api/search/conversations — the signed-in buyer's chat history, newest
// first, for the sidebar they pick a thread from (2026-08-26). Opening one
// still goes through /api/search/conversation?id=, which returns the real
// turn snapshots; this only produces the rows.
//
// Guarded, unlike every other route under /api/search: those stay public
// because search itself is anonymous and a conversation is owned by an
// unguessable deviceId. A HISTORY has no such token — it's "everything
// belonging to this person" — so the buyerId can only ever come from a
// verified session here, never from a query parameter a caller supplies.
export async function GET(req: Request) {
  const auth = await requireBuyerAuth();
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(req.url);
  const rawLimit = Number.parseInt(searchParams.get("limit") ?? "", 10);
  const before = searchParams.get("before");

  try {
    const list = await listSearchConversations({
      buyerId: auth.buyerId,
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
