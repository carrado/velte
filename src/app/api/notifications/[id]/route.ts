import { NextResponse } from "next/server";

import { fail, jsonError } from "@/lib/server/guards";
import { notificationSession } from "@/lib/server/notificationSession";
import { deleteNotification } from "@/lib/server/notifications";

// DELETE /api/notifications/:id — delete a single notification.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await notificationSession();
  if (!session) return jsonError(401, "Sign in to manage notifications.");

  const { id } = await params;
  try {
    await deleteNotification(id, session.cookie);
    return NextResponse.json({ success: true });
  } catch (err) {
    return fail(err, "Failed to delete notification.");
  }
}
