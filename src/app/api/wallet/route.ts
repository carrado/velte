import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { getWallet } from "@/lib/server/wallet";

// GET /api/wallet
export async function GET() {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  try {
    const wallet = await getWallet(gate.cookie);
    return NextResponse.json({ wallet });
  } catch (err) {
    return fail(err, "Failed to load wallet.");
  }
}
