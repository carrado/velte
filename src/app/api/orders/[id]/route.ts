import { NextResponse } from "next/server";

import { requireAuth, jsonError } from "@/lib/server/guards";
import { BackendError } from "@/lib/server/backend";
import { getOrderDetail } from "@/lib/server/orders";

// GET /api/orders/:id
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  const { id } = await params;
  try {
    const order = await getOrderDetail(id, gate.cookie);
    return NextResponse.json({ order });
  } catch (err) {
    if (err instanceof BackendError) return jsonError(err.status, err.message);
    return jsonError(500, "Failed to load order.");
  }
}
