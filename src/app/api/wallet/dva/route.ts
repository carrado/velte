import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { requestDva } from "@/lib/server/wallet";

// POST /api/wallet/dva
export async function POST() {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  try {
    const wallet = await requestDva(gate.cookie);
    return NextResponse.json({ wallet });
  } catch (err) {
    return fail(err, "Failed to set up bank transfer top-up.");
  }
}
