import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { fail } from "@/lib/server/guards";

export async function POST(req: Request) {
  const buyer = await getOptionalBuyerAuth();
  if (!buyer) {
    return NextResponse.json({ error: "Sign in to review." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  try {
    const data = await backendData("/trust/reviews?audience=buyer", {
      method: "POST",
      body,
      cookie: buyer.cookie,
    });
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Couldn't save that review.");
  }
}
