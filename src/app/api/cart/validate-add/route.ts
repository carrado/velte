import { NextResponse } from "next/server";

import { requireBuyerAuth } from "@/lib/server/buyerGuards";
import { fail } from "@/lib/server/guards";
import { validateCartAdd } from "@/lib/server/cart";

export async function POST(req: Request) {
  const gate = await requireBuyerAuth();
  if ("response" in gate) return gate.response;

  try {
    const body = await req.json();
    const result = await validateCartAdd(
      {
        productId: body?.productId,
        quantity: body?.quantity,
        options: body?.options,
        clientRequestId: body?.clientRequestId,
      },
      gate.cookie,
    );
    return NextResponse.json(result);
  } catch (err) {
    return fail(err, "Couldn't add that to your cart.");
  }
}
