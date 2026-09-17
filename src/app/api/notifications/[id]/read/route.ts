import { NextResponse } from "next/server";

import { fail, jsonError } from "@/lib/server/guards";
import { notificationSession } from "@/lib/server/notificationSession";
import { markNotificationRead } from "@/lib/server/notifications";

// PATCH /api/notifications/:id/read — mark a single notification read.
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await notificationSession();
  if (!session) return jsonError(401, "Sign in to manage notifications.");

  const { id } = await params;
  try {
    await markNotificationRead(id, session.cookie);
    return NextResponse.json({ success: true });
  } catch (err) {
    return fail(err, "Failed to update notification.");
  }
}
