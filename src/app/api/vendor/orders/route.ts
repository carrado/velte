import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { listVendorOrders } from "@/lib/server/cart";

export async function GET(req: Request) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const orders = await listVendorOrders(
      gate.cookie,
      status === "paid" || status === "confirmed" ? status : undefined,
    );
    return NextResponse.json({ orders });
  } catch (err) {
    return fail(err, "Failed to load orders.");
  }
}
