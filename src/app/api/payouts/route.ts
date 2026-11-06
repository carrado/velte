import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import {
  getPayoutAccount,
  savePayoutAccount,
  removePayoutAccount,
} from "@/lib/server/payouts";

// GET /api/payouts
export async function GET() {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  try {
    const payout = await getPayoutAccount(gate.cookie);
    return NextResponse.json({ payout });
  } catch (err) {
    return fail(err, "Failed to load payout account.");
  }
}

// POST /api/payouts
export async function POST(req: Request) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  try {
    const body = await req.json();
    const payout = await savePayoutAccount(
      { bankCode: body?.bankCode, accountNumber: body?.accountNumber },
      gate.cookie,
    );
    return NextResponse.json({ payout });
  } catch (err) {
    return fail(err, "Failed to save payout account.");
  }
}

// DELETE /api/payouts
export async function DELETE() {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  try {
    await removePayoutAccount(gate.cookie);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err, "Failed to remove payout account.");
  }
}
