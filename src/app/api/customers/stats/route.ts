import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { getCustomerStats } from "@/lib/server/customers";

// GET /api/customers/stats
export async function GET() {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  try {
    const stats = await getCustomerStats(gate.cookie);
    return NextResponse.json({ stats });
  } catch (err) {
    return fail(err, "Failed to load customer stats.");
  }
}
