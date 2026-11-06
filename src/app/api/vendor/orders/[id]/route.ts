import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { getVendorOrder } from "@/lib/server/cart";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  try {
    const { id } = await params;
    const order = await getVendorOrder(id, gate.cookie);
    return NextResponse.json({ order });
  } catch (err) {
    return fail(err, "Failed to load that order.");
  }
}
