import { NextResponse } from "next/server";

import { requireAuth, fail, jsonError } from "@/lib/server/guards";
import { generatePaymentLink } from "@/lib/server/transactions";
import type { GeneratePaymentLinkPayload } from "@/types/transaction";

// POST /api/transactions/payment-link
export async function POST(req: Request) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  const payload = (await req
    .json()
    .catch(() => null)) as GeneratePaymentLinkPayload | null;
  if (!payload?.bankCode || !payload?.accountNumber) {
    return jsonError(400, "Bank and account details are required.");
  }

  try {
    const paymentLink = await generatePaymentLink(payload, gate.cookie);
    return NextResponse.json({ paymentLink }, { status: 201 });
  } catch (err) {
    return fail(err, "Failed to generate payment link.");
  }
}
