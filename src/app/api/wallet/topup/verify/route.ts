import { NextRequest, NextResponse } from "next/server";

import { requireAuth, fail, jsonError } from "@/lib/server/guards";
import { verifyTopup } from "@/lib/server/wallet";

// POST /api/wallet/topup/verify
export async function POST(req: NextRequest) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  const body = await req.json().catch(() => null);
  const reference = body?.reference as string | undefined;
  if (!reference) return jsonError(400, "reference is required.");

  try {
    const wallet = await verifyTopup(reference, gate.cookie);
    return NextResponse.json({ wallet });
  } catch (err) {
    return fail(err, "Failed to verify top-up.");
  }
}
