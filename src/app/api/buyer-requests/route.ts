import { NextResponse } from "next/server";

import { fail, jsonError } from "@/lib/server/guards";
import { requireBuyerAuth } from "@/lib/server/buyerGuards";
import { backendData } from "@/lib/server/backend";
import type { BuyerRequest } from "@/types/buyerRequest";

// POST /api/buyer-requests
export async function POST(req: Request) {
  const gate = await requireBuyerAuth();
  if ("response" in gate) return gate.response;

  const body = await req.json().catch(() => null);
  if (!body) return jsonError(400, "A request payload is required.");

  try {
    const { request } = await backendData<{ request: BuyerRequest }>(
      "/buyer-requests",
      { method: "POST", body, cookie: gate.cookie },
    );
    return NextResponse.json({ request }, { status: 201 });
  } catch (err) {
    return fail(err, "Failed to post your request.");
  }
}
