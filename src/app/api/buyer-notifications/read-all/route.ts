import { NextResponse } from "next/server";

import { fail } from "@/lib/server/guards";
import { requireBuyerAuth } from "@/lib/server/buyerGuards";
import { backendData } from "@/lib/server/backend";

// PATCH /api/buyer-notifications/read-all
export async function PATCH() {
  const gate = await requireBuyerAuth();
  if ("response" in gate) return gate.response;
  try {
    await backendData("/buyer-notifications/read-all", {
      method: "PATCH",
      cookie: gate.cookie,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err, "Failed to update your notifications.");
  }
}
