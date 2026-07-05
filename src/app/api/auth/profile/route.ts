import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { backendFetch } from "@/lib/server/backend";

// PUT /api/auth/profile
export async function PUT(req: Request) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  const body = await req.json().catch(() => ({}));
  try {
    const { user, addressChangeBlocked, addressChangeAvailableAt } =
      await backendFetch<{
        user: Record<string, unknown>;
        addressChangeBlocked: boolean;
        addressChangeAvailableAt: string | null;
      }>("/auth/profile", { method: "PUT", body, cookie: gate.cookie });
    return NextResponse.json({
      user,
      addressChangeBlocked,
      addressChangeAvailableAt,
    });
  } catch (err) {
    return fail(err, "Failed to update profile.");
  }
}
