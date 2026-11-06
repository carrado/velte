import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { getPayoutBanks } from "@/lib/server/payouts";

// GET /api/payouts/banks
export async function GET() {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  try {
    const banks = await getPayoutBanks(gate.cookie);
    return NextResponse.json({ banks });
  } catch (err) {
    return fail(err, "Failed to load banks.");
  }
}
