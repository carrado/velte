import { NextRequest, NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { getWalletStats } from "@/lib/server/wallet";

// GET /api/wallet/stats?months=3|6|12
export async function GET(req: NextRequest) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  const months = Number(req.nextUrl.searchParams.get("months")) || undefined;
  try {
    const stats = await getWalletStats(gate.cookie, months);
    return NextResponse.json({ stats });
  } catch (err) {
    return fail(err, "Failed to load wallet stats.");
  }
}
