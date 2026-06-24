import { NextResponse } from "next/server";

import { requireAuth, jsonError } from "@/lib/server/guards";
import { BackendError } from "@/lib/server/backend";
import { getOrderStats } from "@/lib/server/orders";

// GET /api/orders/stats
export async function GET() {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  try {
    const stats = await getOrderStats(gate.cookie);
    return NextResponse.json({ stats });
  } catch (err) {
    if (err instanceof BackendError) return jsonError(err.status, err.message);
    return jsonError(500, "Failed to load order stats.");
  }
}
