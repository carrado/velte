import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { backendFetch } from "@/lib/server/backend";

// GET /api/auth/me
export async function GET() {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  try {
    const { user } = await backendFetch<{ user: Record<string, unknown> }>(
      "/auth/me",
      { cookie: gate.cookie },
    );
    // The backend's /auth/me returns the raw Mongoose doc (`_id`), whereas login
    // returns `id`. The frontend `User` type — and features like push subscribe —
    // depend on `id`, so normalise it here or a getMe() refresh wipes `user.id`.
    return NextResponse.json({ user: { ...user, id: user.id ?? user._id } });
  } catch (err) {
    return fail(err, "Failed to load profile.");
  }
}
