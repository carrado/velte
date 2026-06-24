import { NextResponse } from "next/server";

import { fail } from "@/lib/server/guards";
import { backendFetch } from "@/lib/server/backend";

// POST /api/auth/resend-verification   (public)
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  try {
    const data = await backendFetch("/auth/resend-verification", {
      method: "POST",
      body,
    });
    return NextResponse.json(data ?? { ok: true });
  } catch (err) {
    return fail(err, "Failed to resend verification code.");
  }
}
