import { NextRequest, NextResponse } from "next/server";

import { requireAuth, fail, jsonError } from "@/lib/server/guards";
import { setFundingMethod } from "@/lib/server/wallet";
import type { SetFundingMethodPayload } from "@/types/wallet";

// PUT /api/wallet/funding-method
export async function PUT(req: NextRequest) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  const payload = (await req
    .json()
    .catch(() => null)) as SetFundingMethodPayload | null;
  if (!payload) return jsonError(400, "A payload is required.");

  try {
    const wallet = await setFundingMethod(payload, gate.cookie);
    return NextResponse.json({ wallet });
  } catch (err) {
    return fail(err, "Failed to update funding method.");
  }
}
