import { NextResponse } from "next/server";

import { fail, jsonError } from "@/lib/server/guards";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { backendData } from "@/lib/server/backend";
import type { BuyerRequest } from "@/types/buyerRequest";

// POST /api/buyer-requests
//
// Requires a session (2026-08-29, per explicit product direction). It was
// briefly open to anyone holding a `phoneToken` from verify-otp — a bare
// proof of one number from someone with no account — on the reasoning that
// reaching out was the single thing an anonymous buyer most needed to do.
// Posting a request now requires a real account, so that token is gone from
// both ends: the backend guards this route with verifyBuyerAuth, and the OTP
// endpoints that minted it are behind a session too.
//
// Refused HERE as well as upstream, rather than relying on the backend's
// 401: this saves a round trip on a state the browser already knows it is
// in, and the message is the one the UI acts on.
export async function POST(req: Request) {
  const auth = await getOptionalBuyerAuth();
  if (!auth) {
    return jsonError(401, "Sign in to send this request.");
  }

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
      cookie: auth.cookie,
    });
    return NextResponse.json(
      { created, request: request ?? null },
      { status: created ? 201 : 200 },
    );
  } catch (err) {
    return fail(err, "Failed to post your request.");
  }
}
