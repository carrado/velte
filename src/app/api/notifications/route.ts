import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { fetchNotifications } from "@/lib/server/notifications";

// GET /api/notifications — the signed-in merchant's notification feed + unread count.
export async function GET() {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  try {
    const { notifications, unreadCount } = await fetchNotifications(
      gate.cookie,
    );
    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    return fail(err, "Failed to load notifications.");
  }
}
