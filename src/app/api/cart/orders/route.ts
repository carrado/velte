import { NextResponse } from "next/server";

import { requireBuyerAuth } from "@/lib/server/buyerGuards";
import { fail } from "@/lib/server/guards";
import { listBuyerOrders } from "@/lib/server/cart";

export async function GET() {
  const gate = await requireBuyerAuth();
  if ("response" in gate) return gate.response;

  try {
    const orders = await listBuyerOrders(gate.cookie);
    return NextResponse.json({ orders });
  } catch (err) {
    return fail(err, "Failed to load orders.");
  }
}
