import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { markNotificationRead } from "@/lib/server/notifications";

// PATCH /api/notifications/:id/read — mark a single notification read.
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  const { id } = await params;
  try {
    await markNotificationRead(id, gate.cookie);
    return NextResponse.json({ success: true });
  } catch (err) {
    return fail(err, "Failed to update notification.");
  }
}
