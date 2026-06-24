import { NextRequest, NextResponse } from "next/server";

import { requireAuth, jsonError } from "@/lib/server/guards";
import { BackendError } from "@/lib/server/backend";
import { listOrders } from "@/lib/server/orders";

// GET /api/orders?page=&limit=&tab=&search=&payment_status=&sort_by=&sort_order=
export async function GET(req: NextRequest) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  try {
    const page = await listOrders(req.nextUrl.searchParams, gate.cookie);
    return NextResponse.json(page);
  } catch (err) {
    if (err instanceof BackendError) return jsonError(err.status, err.message);
    return jsonError(500, "Failed to load orders.");
  }
}
