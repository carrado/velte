import { NextResponse } from "next/server";

import { fail, applySetCookies } from "@/lib/server/guards";
import { backendFetchWithCookies } from "@/lib/server/backend";
import type { Buyer } from "@/types/buyer";

// POST /api/buyer-auth/firebase — public; exchanges the Firebase ID token
// the browser got from signing in with Google for the SAME buyer_auth_token
// session cookie /api/buyer-auth/verify-otp issues, relayed from the
// backend. Deliberately the same shape as that route: the two sign-in paths
// differ only in what they prove, never in what they produce.
//
// Named for the TOKEN, not the provider: Firebase is the issuer, and Google
// is just the provider behind it today — adding Apple or another one later
// changes nothing on this route or anything downstream of it.
//
// The token is passed straight through unexamined — verifying it means
// checking Firebase's signature, issuer and audience, which happens once,
// server-side, in velte-backend's firebaseAuth.controller.js. Doing any of
// it here as well would be a second place to get it subtly wrong.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  try {
    const { data, setCookie } = await backendFetchWithCookies<{
      data: { buyer: Buyer };
    }>("/buyer-auth/firebase", { method: "POST", body });
    return applySetCookies(
      NextResponse.json({ buyer: data.data.buyer }),
      setCookie,
    );
  } catch (err) {
    return fail(err, "Sign-in failed.");
  }
}
