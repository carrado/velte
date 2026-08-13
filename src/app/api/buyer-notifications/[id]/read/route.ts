import { NextResponse } from "next/server";

import { fail } from "@/lib/server/guards";
import { requireBuyerAuth } from "@/lib/server/buyerGuards";
import { backendData } from "@/lib/server/backend";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/buyer-notifications/:id/read
export async function PATCH(_req: Request, { params }: Ctx) {
  const gate = await requireBuyerAuth();
  if ("response" in gate) return gate.response;
  const { id } = await params;
  try {
    await backendData(`/buyer-notifications/${id}/read`, {
      method: "PATCH",
      cookie: gate.cookie,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err, "Failed to update that notification.");
  }
}
