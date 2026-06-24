import { NextResponse } from "next/server";

import { fail, applySetCookies } from "@/lib/server/guards";
import { backendFetchWithCookies } from "@/lib/server/backend";
import type { User } from "@/types/user";

// POST /api/auth/login   (public — sets the session cookie)
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  try {
    const { data, setCookie } = await backendFetchWithCookies<{ user: User }>(
      "/auth/login",
      { method: "POST", body },
    );
    return applySetCookies(NextResponse.json({ user: data.user }), setCookie);
  } catch (err) {
    return fail(err, "Login failed.");
  }
}
