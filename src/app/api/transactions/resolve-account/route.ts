import { NextRequest, NextResponse } from "next/server";

import { requireAuth, fail, jsonError } from "@/lib/server/guards";
import { resolveAccount } from "@/lib/server/transactions";

// GET /api/transactions/resolve-account?accountNumber=&bankCode=
export async function GET(req: NextRequest) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  const sp = req.nextUrl.searchParams;
  const accountNumber = sp.get("accountNumber");
  const bankCode = sp.get("bankCode");
  if (!accountNumber || !bankCode) {
    return jsonError(400, "accountNumber and bankCode are required.");
  }

  try {
    const account = await resolveAccount(accountNumber, bankCode, gate.cookie);
    return NextResponse.json({ account });
  } catch (err) {
    return fail(err, "Failed to resolve account.");
  }
}
