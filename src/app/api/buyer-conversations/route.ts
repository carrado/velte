import { NextResponse } from "next/server";

import { fail, jsonError } from "@/lib/server/guards";
import { requireBuyerAuth } from "@/lib/server/buyerGuards";
import { backendData } from "@/lib/server/backend";
import type { ConversationSummary } from "@/types/buyerConversation";

// GET /api/buyer-conversations — the buyer dashboard's "Recent" list.
export async function GET() {
  const gate = await requireBuyerAuth();
  if ("response" in gate) return gate.response;
  try {
    const { conversations } = await backendData<{
      conversations: ConversationSummary[];
    }>("/buyer-conversations", { cookie: gate.cookie });
    return NextResponse.json({ conversations });
  } catch (err) {
    return fail(err, "Failed to load your conversations.");
  }
}

// POST /api/buyer-conversations — { conversationId?, turns } upsert, fired
// by SearchHome.tsx after every completed exchange (only once a buyer
// session exists — see that component's own comment).
export async function POST(req: Request) {
  const gate = await requireBuyerAuth();
  if ("response" in gate) return gate.response;

  const body = await req.json().catch(() => null);
  if (!body) return jsonError(400, "A payload is required.");

  try {
    const { conversation } = await backendData<{
      conversation: ConversationSummary;
    }>("/buyer-conversations", {
      method: "POST",
      body,
      cookie: gate.cookie,
    });
    return NextResponse.json({ conversation }, { status: 201 });
  } catch (err) {
    return fail(err, "Failed to save your conversation.");
  }
}
