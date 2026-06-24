import { NextResponse } from "next/server";

import { requireAuth, fail, jsonError } from "@/lib/server/guards";
import { restockProduct } from "@/lib/server/products";

// POST /api/products/:id/restock   body: { quantity }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  const { id } = await params;

  const body = (await req.json().catch(() => null)) as {
    quantity?: number;
  } | null;
  if (typeof body?.quantity !== "number") {
    return jsonError(400, "A numeric quantity is required.");
  }

  try {
    const product = await restockProduct(id, body.quantity, gate.cookie);
    return NextResponse.json({ product });
  } catch (err) {
    return fail(err, "Failed to restock product.");
  }
}
