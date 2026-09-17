import { NextResponse } from "next/server";

import { AiSearchBackendError } from "@/lib/server/aiSearchBackend";
import { deleteSearchConversation } from "@/lib/server/searchConversations";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { getOptionalVendorAuth, jsonError } from "@/lib/server/guards";

// DELETE /api/search/conversations/:id — removes one row from the signed-in
// buyer's OR vendor's chat history sidebar, for good (2026-09-09, widened
// 2026-09-17). Guarded exactly like the list this is deleting a row out of
// (GET /api/search/conversations) — a real session's buyerId/vendorId,
// never a query parameter a caller supplies, same reasoning as that route's
// own top comment. Buyer wins when both cookies exist.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const buyerAuth = await getOptionalBuyerAuth();
  const vendorAuth = buyerAuth ? null : await getOptionalVendorAuth();
  if (!buyerAuth && !vendorAuth) {
    return jsonError(401, "Sign in to manage your conversations.");
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: "Conversation id is required." },
      { status: 400 },
    );
  }

  try {
    await deleteSearchConversation({
      conversationId: id,
      buyerId: buyerAuth?.buyerId ?? null,
      vendorId: vendorAuth?.userId ?? null,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AiSearchBackendError && err.status < 500) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[search/conversations] delete failed:", err);
    return NextResponse.json(
      { error: "Couldn't delete that conversation." },
      { status: 502 },
    );
  }
}
