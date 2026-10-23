import { NextResponse } from "next/server";

import { requireBuyerAuth } from "@/lib/server/buyerGuards";
import { fail } from "@/lib/server/guards";
import { verifyCartCheckout } from "@/lib/server/cart";

export async function POST(req: Request) {
  const gate = await requireBuyerAuth();
  if ("response" in gate) return gate.response;

  try {
    const body = await req.json();
    const order = await verifyCartCheckout(
      String(body?.reference ?? ""),
      gate.cookie,
    );
    return NextResponse.json({ order });
  } catch (err) {
    return fail(err, "Couldn't confirm that payment.");
  }
}
