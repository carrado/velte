import { NextResponse } from "next/server";

import { fail, jsonError } from "@/lib/server/guards";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { backendData } from "@/lib/server/backend";
import type { BuyerRequest } from "@/types/buyerRequest";

// POST /api/buyer-requests
//
// Guarded by getOptionalBuyerAuth, not requireBuyerAuth (2026-08-27).
// Verifying a phone stopped creating a Buyer or a session — `buyer_auth_token`
// now means "signed in with Google" and nothing else — so most buyers posting
// a request legitimately have no session at all. They carry a `phoneToken`
// from verify-otp in the body instead, proving the one number a vendor will
// reply to, and the backend accepts either (see requireBuyerOrVerifiedPhone).
//
// Requiring a session here would shut anonymous buyers out of the reach-out
// flow entirely, which is the single thing on Velte an anonymous buyer most
// needs to do. The backend still rejects a request carrying neither, so this
// being open doesn't make it unauthenticated.
export async function POST(req: Request) {
  const auth = await getOptionalBuyerAuth();

  const body = await req.json().catch(() => null);
  if (!body) return jsonError(400, "A request payload is required.");

  try {
    // Backend skips persisting anything when matching found zero vendors —
    // `created: false`, no `request` (see createRequest's own comment) —
    // rather than always creating a request nobody would ever see.
    const { created, request } = await backendData<{
      created: boolean;
      request?: BuyerRequest;
    }>("/buyer-requests", {
      method: "POST",
      body,
      // Forwarded only when one exists; the phoneToken travels in `body`.
      ...(auth ? { cookie: auth.cookie } : {}),
    });
    return NextResponse.json(
      { created, request: request ?? null },
      { status: created ? 201 : 200 },
    );
  } catch (err) {
    return fail(err, "Failed to post your request.");
  }
}
