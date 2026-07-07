import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { fetchMyReferrals } from "@/lib/server/referrals";

// GET /api/referrals — the signed-in vendor's own referral code, stats, and
// recent referral history.
export async function GET() {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  try {
    const data = await fetchMyReferrals(gate.cookie);
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Failed to load referrals.");
  }
}
