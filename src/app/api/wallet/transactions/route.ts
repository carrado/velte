import { NextRequest, NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { listWalletTransactions } from "@/lib/server/wallet";

// GET /api/wallet/transactions?page=&limit=&type=&startDate=&endDate=
export async function GET(req: NextRequest) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  try {
    const result = await listWalletTransactions(
      req.nextUrl.searchParams,
      gate.cookie,
    );
    return NextResponse.json(result);
  } catch (err) {
    return fail(err, "Failed to load wallet transactions.");
  }
}
