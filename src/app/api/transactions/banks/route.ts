import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { listBanks } from "@/lib/server/transactions";

// GET /api/transactions/banks
export async function GET() {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  try {
    const banks = await listBanks(gate.cookie);
    return NextResponse.json({ banks });
  } catch (err) {
    return fail(err, "Failed to load banks.");
  }
}
