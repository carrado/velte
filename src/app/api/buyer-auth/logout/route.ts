import { NextResponse } from "next/server";

import { fail, applySetCookies } from "@/lib/server/guards";
import { backendFetchWithCookies } from "@/lib/server/backend";

// POST /api/buyer-auth/logout
export async function POST() {
  try {
    const { setCookie } = await backendFetchWithCookies("/buyer-auth/logout", {
      method: "POST",
    });
    return applySetCookies(NextResponse.json({ ok: true }), setCookie);
  } catch (err) {
    return fail(err, "Logout failed.");
  }
}
