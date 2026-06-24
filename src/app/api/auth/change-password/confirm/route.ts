import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { backendFetch } from "@/lib/server/backend";

// POST /api/auth/change-password/confirm
export async function POST(req: Request) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  const body = await req.json().catch(() => ({}));
  try {
    const { message } = await backendFetch<{ message?: string }>(
      "/auth/change-password/confirm",
      { method: "POST", body, cookie: gate.cookie },
    );
    return NextResponse.json({ message: message ?? "" });
  } catch (err) {
    return fail(err, "Failed to confirm password change.");
  }
}
