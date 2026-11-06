import { NextResponse } from "next/server";

import { requireBuyerAuth } from "@/lib/server/buyerGuards";
import { fail } from "@/lib/server/guards";
import { getBuyerOrder } from "@/lib/server/cart";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireBuyerAuth();
  if ("response" in gate) return gate.response;

  try {
    const { id } = await params;
    const order = await getBuyerOrder(id, gate.cookie);
    return NextResponse.json({ order });
  } catch (err) {
    return fail(err, "Failed to load that order.");
  }
}
