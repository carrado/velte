import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { reactivatePaymentLink } from "@/lib/server/transactions";

// PATCH /api/transactions/payment-link/:id/reactivate
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  const { id } = await params;
  try {
    const paymentLink = await reactivatePaymentLink(id, gate.cookie);
    return NextResponse.json({ paymentLink });
  } catch (err) {
    return fail(err, "Failed to reactivate payment link.");
  }
}
