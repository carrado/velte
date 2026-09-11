import { NextResponse } from "next/server";

import { fail } from "@/lib/server/guards";
import { notificationSession } from "@/lib/server/notificationSession";
import { fetchNotifications } from "@/lib/server/notifications";

// GET /api/notifications — the signed-in account's feed + unread count.
// Either kind of account (2026-09-05) — see notificationSession.
export async function GET() {
  const session = await notificationSession();
  // An empty feed rather than a 401: the sidebar badge renders for anyone,
  // and a signed-out visitor having "no notifications" is the truth, not an
  // error worth surfacing.
  if (!session) return NextResponse.json({ notifications: [], unreadCount: 0 });

  try {
    const { notifications, unreadCount } = await fetchNotifications(
      session.cookie,
    );
    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    return fail(err, "Failed to load notifications.");
  }
}
