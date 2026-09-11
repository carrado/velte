import { NextResponse } from "next/server";

import { AiSearchBackendError } from "@/lib/server/aiSearchBackend";
import { deleteSearchConversation } from "@/lib/server/searchConversations";
import { requireBuyerAuth } from "@/lib/server/buyerGuards";

// DELETE /api/search/conversations/:id — removes one row from the signed-in
// buyer's chat history sidebar, for good (2026-09-09). Guarded exactly like
// the list this is deleting a row out of (GET /api/search/conversations) —
// a real session's buyerId, never a query parameter a caller supplies, same
// reasoning as that route's own top comment.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireBuyerAuth();
  if ("response" in auth) return auth.response;

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
      buyerId: auth.buyerId,
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
