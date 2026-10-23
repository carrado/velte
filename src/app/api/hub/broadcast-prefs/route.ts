import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { fail } from "@/lib/server/guards";

export async function PATCH(req: Request) {
  const buyer = await getOptionalBuyerAuth();
  if (!buyer)
    return NextResponse.json({ error: "Sign in as a buyer." }, { status: 401 });
  const body = await req.json().catch(() => null);
  try {
    const data = await backendData("/hub/broadcast-prefs?audience=buyer", {
      method: "PATCH",
      body,
      cookie: buyer.cookie,
    });
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Couldn't save those preferences.");
  }
}
