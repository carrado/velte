import { NextResponse } from "next/server";

import { fail } from "@/lib/server/guards";
import { requireBuyerAuth } from "@/lib/server/buyerGuards";
import { backendData } from "@/lib/server/backend";
import type { Buyer } from "@/types/buyer";

// GET /api/buyer-auth/me
export async function GET() {
  const gate = await requireBuyerAuth();
  if ("response" in gate) return gate.response;
  try {
    const { buyer } = await backendData<{ buyer: Buyer }>("/buyer-auth/me", {
      cookie: gate.cookie,
    });
    return NextResponse.json({ buyer });
  } catch (err) {
    return fail(err, "Failed to load your profile.");
  }
}
