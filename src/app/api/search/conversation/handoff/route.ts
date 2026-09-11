import { NextResponse } from "next/server";

import { AiSearchBackendError } from "@/lib/server/aiSearchBackend";
import { markSearchConversationHandoff } from "@/lib/server/searchConversations";

// POST — flips the persisted shopping task to "handed_off" when the buyer
// clicks a WhatsApp chat CTA on a search result (Phase 1 follow-up,
// docs/velte-ai-search-flow-plan.md). Fired from reportLead as a
// best-effort beacon RIGHT as the tab is navigating to WhatsApp, so this
// must accept sendBeacon's plain JSON POST and never matter if it's lost —
// same contract as the lead-billing beacon it rides alongside. Public,
// deviceId-owned, same trust model as the sibling conversation route.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    conversationId?: string;
    deviceId?: string;
  } | null;

  if (!body?.conversationId || !body?.deviceId) {
    return NextResponse.json(
      { error: "conversationId and deviceId are required." },
      { status: 400 },
    );
  }

  try {
    await markSearchConversationHandoff({
      conversationId: body.conversationId,
      deviceId: body.deviceId,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AiSearchBackendError && err.status < 500) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[search/conversation] handoff mark failed:", err);
    return NextResponse.json(
      { error: "Couldn't record the handoff." },
      { status: 502 },
    );
  }
}
