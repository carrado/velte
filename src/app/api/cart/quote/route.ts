import { NextResponse } from "next/server";

import { requireBuyerAuth } from "@/lib/server/buyerGuards";
import { fail } from "@/lib/server/guards";
import { quoteCart } from "@/lib/server/cart";

export async function POST(req: Request) {
  const gate = await requireBuyerAuth();
  if ("response" in gate) return gate.response;

  try {
    const body = await req.json();
    const quote = await quoteCart({ items: body?.items }, gate.cookie);
    return NextResponse.json(quote);
  } catch (err) {
    return fail(err, "Couldn't price that cart.");
  }
}
