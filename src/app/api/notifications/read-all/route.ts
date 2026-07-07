import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { markAllNotificationsRead } from "@/lib/server/notifications";

// PATCH /api/notifications/read-all — mark every unread notification read.
export async function PATCH() {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  try {
    await markAllNotificationsRead(gate.cookie);
    return NextResponse.json({ success: true });
  } catch (err) {
    return fail(err, "Failed to update notifications.");
  }
}
