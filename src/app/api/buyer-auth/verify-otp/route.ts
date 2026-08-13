import { NextResponse } from "next/server";

import { fail, applySetCookies } from "@/lib/server/guards";
import { backendFetchWithCookies } from "@/lib/server/backend";
import type { Buyer } from "@/types/buyer";

// POST /api/buyer-auth/verify-otp — public; sets the buyer_auth_token
// session cookie on success (relayed from the backend, same pattern as
// /api/auth/login for vendors).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  try {
    const { data, setCookie } = await backendFetchWithCookies<{
      data: { buyer: Buyer };
    }>("/buyer-auth/verify-otp", { method: "POST", body });
    return applySetCookies(
      NextResponse.json({ buyer: data.data.buyer }),
      setCookie,
    );
  } catch (err) {
    return fail(err, "Verification failed.");
  }
}
