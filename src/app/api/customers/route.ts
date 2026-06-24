import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { listCustomers } from "@/lib/server/customers";

// GET /api/customers
export async function GET() {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  try {
    const customers = await listCustomers(gate.cookie);
    return NextResponse.json({ customers });
  } catch (err) {
    return fail(err, "Failed to load customers.");
  }
}
