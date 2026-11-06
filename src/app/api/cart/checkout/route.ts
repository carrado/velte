import { NextResponse } from "next/server";

import { requireBuyerAuth } from "@/lib/server/buyerGuards";
import { fail } from "@/lib/server/guards";
import { checkoutCart } from "@/lib/server/cart";

export async function POST(req: Request) {
  const gate = await requireBuyerAuth();
  if ("response" in gate) return gate.response;

  try {
    const body = await req.json();
    const result = await checkoutCart(
      { items: body?.items, fulfillment: body?.fulfillment },
      gate.cookie,
    );
    return NextResponse.json(result);
  } catch (err) {
    return fail(err, "Couldn't start checkout.");
  }
}
