import { NextResponse } from "next/server";

import { fail } from "@/lib/server/guards";
import { backendFetch } from "@/lib/server/backend";

// POST /api/buyer-auth/request-otp — public, no session (the buyer doesn't
// have one yet — this is how they get one).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  try {
    await backendFetch("/buyer-auth/request-otp", { method: "POST", body });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err, "Couldn't send the verification code.");
  }
}
