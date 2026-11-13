import { NextResponse } from "next/server";
import {
  startHubWsServer,
  broadcastListingToWsClients,
  broadcastToUser,
  clearWsCache,
  triggerImmediateUserSync,
  type HubWsMessage,
} from "@/server/hubWsServer";
import type { HubTimelineItem } from "@/types/hub";

export async function GET() {
  const result = startHubWsServer();
  return NextResponse.json({
    ok: true,
    ...result,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      item?: HubTimelineItem;
      items?: HubTimelineItem[];
      action?: string;
      userId?: string;
      event?: HubWsMessage;
    };
    if (body.action === "clear") {
      clearWsCache();
      return NextResponse.json({ ok: true, cleared: true });
    }
    if (body.action === "trigger_sync") {
      void triggerImmediateUserSync({ userId: body.userId });
      return NextResponse.json({ ok: true, triggered: true });
    }
    if (body.action === "notify_user" && body.userId && body.event) {
      broadcastToUser(body.userId, body.event);
      return NextResponse.json({ ok: true, notified: true });
    }
    const items = body.items || (body.item ? [body.item] : []);
    if (items.length > 0) {
      broadcastListingToWsClients(items);
    }
    return NextResponse.json({ ok: true, count: items.length });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

export async function DELETE() {
  clearWsCache();
  return NextResponse.json({ ok: true, cleared: true });
}
