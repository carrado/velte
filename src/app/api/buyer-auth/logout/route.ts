import { NextResponse } from "next/server";

import { applySetCookies } from "@/lib/server/guards";
import { backendFetchWithCookies } from "@/lib/server/backend";
import { BUYER_AUTH_COOKIE } from "@/lib/server/buyerSession";

// POST /api/buyer-auth/logout
export async function POST() {
  try {
    const { setCookie } = await backendFetchWithCookies("/buyer-auth/logout", {
      method: "POST",
    });
    const res = applySetCookies(NextResponse.json({ ok: true }), setCookie);
    res.cookies.delete(BUYER_AUTH_COOKIE);
    return res;
  } catch {
    const res = NextResponse.json({ ok: true });
    res.cookies.delete(BUYER_AUTH_COOKIE);
    return res;
  }
}
