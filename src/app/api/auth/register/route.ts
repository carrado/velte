import { NextResponse } from "next/server";

import { fail, applySetCookies } from "@/lib/server/guards";
import { backendFetchWithCookies } from "@/lib/server/backend";

// POST /api/auth/register   (public)
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  try {
    const { data, setCookie } = await backendFetchWithCookies(
      "/auth/register",
      {
        method: "POST",
        body,
      },
    );
    return applySetCookies(NextResponse.json(data ?? { ok: true }), setCookie);
  } catch (err) {
    return fail(err, "Registration failed.");
  }
}
