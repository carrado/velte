import { NextResponse } from "next/server";

import { requireAuth, jsonError } from "@/lib/server/guards";
import { BackendError } from "@/lib/server/backend";
import { setOrderStatus, ORDER_STATUSES } from "@/lib/server/orders";
import type { OrderStatus } from "@/types/order";

// PATCH /api/orders/:id/status   body: { status: OrderStatus }
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as {
    status?: OrderStatus;
  } | null;

  if (!body?.status || !ORDER_STATUSES.includes(body.status)) {
    return jsonError(400, "A valid order status is required.");
  }

  try {
    const order = await setOrderStatus(id, body.status, gate.cookie);
    return NextResponse.json({ order });
  } catch (err) {
    if (err instanceof BackendError) return jsonError(err.status, err.message);
    return jsonError(500, "Failed to update order status.");
  }
}
