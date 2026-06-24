import { NextResponse } from "next/server";

import { requireAuth, fail, jsonError } from "@/lib/server/guards";
import { initiateOrderRefund } from "@/lib/server/transactions";
import type { InitiateOrderRefundPayload } from "@/types/transaction";

// POST /api/transactions/order-refund
export async function POST(req: Request) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  const payload = (await req
    .json()
    .catch(() => null)) as InitiateOrderRefundPayload | null;
  if (!payload?.orderId || typeof payload?.amount !== "number") {
    return jsonError(400, "orderId and a numeric amount are required.");
  }

  try {
    const refund = await initiateOrderRefund(payload, gate.cookie);
    return NextResponse.json({ refund });
  } catch (err) {
    return fail(err, "Failed to initiate refund.");
  }
}
