import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { backendFetch } from "@/lib/server/backend";
import type { UserNotifications } from "@/types/user";

// GET /api/auth/notifications
export async function GET() {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  try {
    const { notifications } = await backendFetch<{
      notifications: UserNotifications;
    }>("/auth/notifications", { cookie: gate.cookie });
    return NextResponse.json({ notifications });
  } catch (err) {
    return fail(err, "Failed to load notification settings.");
  }
}

// PUT /api/auth/notifications
export async function PUT(req: Request) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  const body = await req.json().catch(() => ({}));
  try {
    const { notifications } = await backendFetch<{
      notifications: UserNotifications;
    }>("/auth/notifications", { method: "PUT", body, cookie: gate.cookie });
    return NextResponse.json({ notifications });
  } catch (err) {
    return fail(err, "Failed to save notification settings.");
  }
}
