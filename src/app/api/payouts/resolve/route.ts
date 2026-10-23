import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { resolvePayoutAccount } from "@/lib/server/payouts";

// POST /api/payouts/resolve — name-only preview, stores nothing.
export async function POST(req: Request) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  try {
    const body = await req.json();
    const resolved = await resolvePayoutAccount(
      { bankCode: body?.bankCode, accountNumber: body?.accountNumber },
      gate.cookie,
    );
    return NextResponse.json(resolved);
  } catch (err) {
    return fail(err, "Failed to look up that account.");
  }
}
