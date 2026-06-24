import { NextRequest, NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { listTransactions } from "@/lib/server/transactions";

// GET /api/transactions?page=&limit=&status=&search=&sortBy=&sortOrder=&paymentMethod=&startDate=&endDate=
export async function GET(req: NextRequest) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  try {
    const result = await listTransactions(
      req.nextUrl.searchParams,
      gate.cookie,
    );
    return NextResponse.json(result);
  } catch (err) {
    return fail(err, "Failed to load transactions.");
  }
}
