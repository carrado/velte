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
    // Backend skips persisting anything when matching found zero vendors —
    // `created: false`, no `request` (see createRequest's own comment) —
    // rather than always creating a request nobody would ever see.
    const { created, request } = await backendData<{
      created: boolean;
      request?: BuyerRequest;
    }>("/buyer-requests", { method: "POST", body, cookie: gate.cookie });
    return NextResponse.json(
      { created, request: request ?? null },
      { status: created ? 201 : 200 },
    );
  } catch (err) {
    return fail(err, "Failed to post your request.");
  }
}
