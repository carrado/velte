import { NextRequest, NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { getMyStore, updateMyStore } from "@/lib/server/store";

// GET /api/store — the authed vendor's own store (created lazily upstream)
export async function GET() {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  try {
    const store = await getMyStore(gate.cookie);
    return NextResponse.json({ store });
  } catch (err) {
    return fail(err, "Failed to load store.");
  }
}

// PUT /api/store — update store profile
export async function PUT(req: NextRequest) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  try {
    const store = await updateMyStore(body, gate.cookie);
    return NextResponse.json({ store });
  } catch (err) {
    return fail(err, "Failed to update store.");
  }
}
