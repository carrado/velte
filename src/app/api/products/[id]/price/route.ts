import { NextResponse } from "next/server";

import { requireAuth, fail, jsonError } from "@/lib/server/guards";
import { changePrice } from "@/lib/server/products";

// PATCH /api/products/:id/price   body: { price }  (naira; converted to kobo upstream)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  const { id } = await params;

  const body = (await req.json().catch(() => null)) as {
    price?: number;
  } | null;
  if (typeof body?.price !== "number") {
    return jsonError(400, "A numeric price is required.");
  }

  try {
    const product = await changePrice(id, body.price, gate.cookie);
    return NextResponse.json({ product });
  } catch (err) {
    return fail(err, "Failed to update price.");
  }
}
