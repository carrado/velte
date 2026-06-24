import { NextResponse } from "next/server";

import { requireAuth, fail, jsonError } from "@/lib/server/guards";
import { setAvailability } from "@/lib/server/products";

// PATCH /api/products/:id/availability   body: { is_currently_available }
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  const { id } = await params;

  const body = (await req.json().catch(() => null)) as {
    is_currently_available?: boolean;
  } | null;
  if (typeof body?.is_currently_available !== "boolean") {
    return jsonError(400, "is_currently_available (boolean) is required.");
  }

  try {
    const result = await setAvailability(
      id,
      body.is_currently_available,
      gate.cookie,
    );
    return NextResponse.json(result);
  } catch (err) {
    return fail(err, "Failed to update availability.");
  }
}
