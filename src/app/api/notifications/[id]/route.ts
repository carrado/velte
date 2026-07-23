import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { deleteNotification } from "@/lib/server/notifications";

// DELETE /api/notifications/:id — delete a single notification.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  const { id } = await params;
  try {
    await deleteNotification(id, gate.cookie);
    return NextResponse.json({ success: true });
  } catch (err) {
    return fail(err, "Failed to delete notification.");
  }
}
