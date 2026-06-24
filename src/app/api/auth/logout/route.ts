import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { fail, applySetCookies } from "@/lib/server/guards";
import { backendFetchWithCookies } from "@/lib/server/backend";
import { AUTH_COOKIE } from "@/lib/server/session";

// POST /api/auth/logout   (clears the session cookie)
export async function POST() {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const cookie = token ? `${AUTH_COOKIE}=${token}` : undefined;
  try {
    const { setCookie } = await backendFetchWithCookies("/auth/logout", {
      method: "POST",
      body: {},
      cookie,
    });
    return applySetCookies(NextResponse.json({ ok: true }), setCookie);
  } catch (err) {
    return fail(err, "Logout failed.");
  }
}
