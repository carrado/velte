import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { backendData } from "@/lib/server/backend";
import type { VendorFollower } from "@/types/followers";

// GET /api/vendor/followers — buyers who follow this vendor's store.
export async function GET() {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  try {
    const { followers } = await backendData<{ followers: VendorFollower[] }>(
      "/vendor/followers",
      { cookie: gate.cookie },
    );
    return NextResponse.json({ followers });
  } catch (err) {
    return fail(err, "Failed to load your followers.");
  }
}
