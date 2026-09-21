import { NextResponse } from "next/server";

import { AiSearchBackendError } from "@/lib/server/aiSearchBackend";
import {
  appendSearchTurn,
  getSearchConversation,
} from "@/lib/server/searchConversations";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { getOptionalVendorAuth } from "@/lib/server/guards";
import type { StoredSearchTurn } from "@/types/search";

// Public (no vendor/buyer session required), same reasoning as /api/search's
// own top comment — ownership is the caller's own deviceId, an unguessable
// per-browser UUID. Two jobs (Phase 1, docs/velte-ai-search-flow-plan.md):
//
// GET  ?id=&deviceId=  — the refresh rehydrate: SearchHome.tsx loads the
//                        stored conversation's turn snapshots on mount and
//                        rebuilds its React state from them. A stale or
//                        unknown conversation 404s; the client clears its
//                        stored id and the next search starts fresh.
//
// POST { conversationId, deviceId, turn } — the client-side persist path
//                        for turns the main /api/search route never sees
//                        (background items resolved via resolve-item, their
//                        clarify rounds). Main-turn persistence happens
//                        server-side inside /api/search itself — this
//                        endpoint is only for client-resolved turns.

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("id");
  const deviceId = searchParams.get("deviceId");
  if (!conversationId || !deviceId) {
    return NextResponse.json(
      { error: "id and deviceId are required." },
      { status: 400 },
    );
  }

  // `includeStale` is set only by the history list's own open action — a
  // thread picked deliberately from the sidebar, where being a day old is
  // the point. The mount-time rehydrate leaves it off and keeps relying on
  // the 404 to drop a finished thread's id (see getSearchConversation).
  const includeStale = searchParams.get("includeStale") === "true";
  // Widens ownership to the account, so a buyer (or vendor) opens their own
  // thread on a browser that never created it. Optional by design: an
  // anonymous buyer still reaches their own conversations by deviceId
  // exactly as before. Buyer wins when both cookies exist, same precedence
  // /api/search's own actorType uses.
  const buyerAuth = await getOptionalBuyerAuth();
  const vendorAuth = buyerAuth ? null : await getOptionalVendorAuth();

  try {
    const conversation = await getSearchConversation({
      conversationId,
      deviceId,
      buyerId: buyerAuth?.buyerId ?? null,
      vendorId: vendorAuth?.userId ?? null,
      includeStale,
    });
    // The backend's own ownership filter is a widening OR (deviceId OR
    // buyerId OR vendorId) — a conversation once attached to an account
    // stays reachable by deviceId alone forever, by design (see its own
    // comment: signing in only ever widens access, never narrows it).
    // That's right for guest continuity, but wrong for an account whose
    // session has since ended some way other than the explicit Log Out
    // button (which is the only place that clears the browser's own
    // stored conversation id) — found live: a VENDOR testing the buyer
    // chat, whose vendor cookie simply expired, kept resuming a Shopping
    // Plan conversation from before on the same device, with the sidebar
    // (auth-gated) correctly showing empty alongside it. Refusing it here,
    // the same way an unknown/stale id already 404s, reuses the client's
    // existing "clear the stored id and start fresh" handling rather than
    // adding a second path for the same outcome. Checked against BOTH
    // fields — a conversation carries at most one of the two, but which
    // one it is isn't known until the response comes back.
    const {
      buyerId: ownerBuyerId,
      vendorId: ownerVendorId,
      ...publicConversation
    } = conversation;
    const mismatchedOwner =
      (ownerBuyerId && ownerBuyerId !== (buyerAuth?.buyerId ?? null)) ||
      (ownerVendorId && ownerVendorId !== (vendorAuth?.userId ?? null));
    if (mismatchedOwner) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    }
    return NextResponse.json({ conversation: publicConversation });
  } catch (err) {
    if (err instanceof AiSearchBackendError && err.status < 500) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[search/conversation] load failed:", err);
    return NextResponse.json(
      { error: "Couldn't load the conversation." },
      { status: 502 },
    );
  }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    conversationId?: string;
    deviceId?: string;
    turn?: StoredSearchTurn;
  } | null;

  if (!body?.conversationId || !body?.deviceId || !body?.turn) {
    return NextResponse.json(
      { error: "conversationId, deviceId and turn are required." },
      { status: 400 },
    );
  }

  const buyerAuth = await getOptionalBuyerAuth();
  const vendorAuth = buyerAuth ? null : await getOptionalVendorAuth();
  try {
    await appendSearchTurn({
      conversationId: body.conversationId,
      deviceId: body.deviceId,
      buyerId: buyerAuth?.buyerId ?? null,
      vendorId: vendorAuth?.userId ?? null,
      turn: body.turn,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AiSearchBackendError && err.status < 500) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[search/conversation] append failed:", err);
    return NextResponse.json(
      { error: "Couldn't save the turn." },
      { status: 502 },
    );
  }
}
