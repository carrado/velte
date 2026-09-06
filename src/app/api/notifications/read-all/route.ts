import { NextResponse } from "next/server";

import { fail, jsonError } from "@/lib/server/guards";
import { notificationSession } from "@/lib/server/notificationSession";
import { markAllNotificationsRead } from "@/lib/server/notifications";

// PATCH /api/notifications/read-all — mark every unread notification read.
export async function PATCH() {
  const session = await notificationSession();
  if (!session) return jsonError(401, "Sign in to manage notifications.");

  try {
    await markAllNotificationsRead(session.cookie);
    return NextResponse.json({ success: true });
  } catch (err) {
    return fail(err, "Failed to update notifications.");
  }
}
