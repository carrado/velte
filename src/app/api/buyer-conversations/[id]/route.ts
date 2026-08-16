import { NextResponse } from "next/server";

import { fail } from "@/lib/server/guards";
import { requireBuyerAuth } from "@/lib/server/buyerGuards";
import { backendData } from "@/lib/server/backend";
import type { BuyerConversation } from "@/types/buyerConversation";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/buyer-conversations/:id — full turns, for resuming a past chat.
export async function GET(_req: Request, { params }: Ctx) {
  const gate = await requireBuyerAuth();
  if ("response" in gate) return gate.response;
  const { id } = await params;
  try {
    const { conversation } = await backendData<{
      conversation: BuyerConversation;
    }>(`/buyer-conversations/${id}`, { cookie: gate.cookie });
    return NextResponse.json({ conversation });
  } catch (err) {
    return fail(err, "Failed to load that conversation.");
  }
}

// DELETE /api/buyer-conversations/:id
export async function DELETE(_req: Request, { params }: Ctx) {
  const gate = await requireBuyerAuth();
  if ("response" in gate) return gate.response;
  const { id } = await params;
  try {
    await backendData(`/buyer-conversations/${id}`, {
      method: "DELETE",
      cookie: gate.cookie,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err, "Failed to delete that conversation.");
  }
}
