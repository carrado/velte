import { NextResponse } from "next/server";

import { fail, jsonError } from "@/lib/server/guards";
import { notificationSession } from "@/lib/server/notificationSession";
import { markAllNotificationsRead } from "@/lib/server/notifications";
import { triggerImmediateUserSync } from "@/server/hubWsServer";

// PATCH /api/notifications/read-all — mark every unread notification read.
export async function PATCH() {
  const session = await notificationSession();
  if (!session) return jsonError(401, "Sign in to manage notifications.");

  try {
    await markAllNotificationsRead(session.cookie);
    void triggerImmediateUserSync({
      checkNotifications: true,
      checkRequests: false,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return fail(err, "Failed to update notifications.");
  }
}
