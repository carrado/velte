import { NextResponse } from "next/server";

import { fail } from "@/lib/server/guards";
import { backendFetch } from "@/lib/server/backend";

// POST /api/auth/getPasswordOTP   (public — forgot-password)
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  try {
    const data = await backendFetch("/auth/getPasswordOTP", {
      method: "POST",
      body,
    });
    return NextResponse.json(data ?? { ok: true });
  } catch (err) {
    return fail(err, "Failed to send reset code.");
  }
}
