import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { fail, requireAuth } from "@/lib/server/guards";

export async function GET() {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  try {
    const data = await backendData<{
      walletBalanceKobo: number;
      note: string;
    }>("/trust/finops", { cookie: gate.cookie });
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Couldn't load that report.");
  }
}
