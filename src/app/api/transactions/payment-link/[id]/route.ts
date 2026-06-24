import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { deletePaymentLink } from "@/lib/server/transactions";

// DELETE /api/transactions/payment-link/:id
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  const { id } = await params;
  try {
    await deletePaymentLink(id, gate.cookie);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err, "Failed to delete payment link.");
  }
}
