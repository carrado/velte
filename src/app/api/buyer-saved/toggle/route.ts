import { NextResponse } from "next/server";

import { fail, jsonError } from "@/lib/server/guards";
import { requireBuyerAuth } from "@/lib/server/buyerGuards";
import { backendData } from "@/lib/server/backend";

// POST /api/buyer-saved/toggle — { kind: "product" | "vendor", targetId }
export async function POST(req: Request) {
  const gate = await requireBuyerAuth();
  if ("response" in gate) return gate.response;

  const body = await req.json().catch(() => null);
  if (!body?.kind || !body?.targetId) {
    return jsonError(400, "kind and targetId are required.");
  }

  try {
    const { saved } = await backendData<{ saved: boolean }>(
      "/buyer-saved/toggle",
      { method: "POST", body, cookie: gate.cookie },
    );
    return NextResponse.json({ saved });
  } catch (err) {
    return fail(err, "Couldn't save that. Please try again.");
  }
}
