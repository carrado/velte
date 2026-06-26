import { NextResponse } from "next/server";

import { requireAuth, jsonError } from "@/lib/server/guards";
import { BackendError } from "@/lib/server/backend";
import { confirmOrderPayment } from "@/lib/server/orders";

// PATCH /api/orders/:id/confirm-payment — vendor confirms a held manual-transfer payment.
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  const { id } = await params;
  try {
    const order = await confirmOrderPayment(id, gate.cookie);
    return NextResponse.json({ order });
  } catch (err) {
    if (err instanceof BackendError) return jsonError(err.status, err.message);
    return jsonError(500, "Failed to confirm payment.");
  }
}
