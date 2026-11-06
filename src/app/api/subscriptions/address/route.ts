import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { fail } from "@/lib/server/guards";

export async function POST(req: Request) {
  const buyerAuth = await getOptionalBuyerAuth();
  if (!buyerAuth) {
    return NextResponse.json(
      { error: "Sign in to save an address." },
      { status: 401 },
    );
  }
  const body = (await req.json().catch(() => null)) as {
    addressLine?: unknown;
    area?: unknown;
    state?: unknown;
  } | null;
  try {
    const data = await backendData("/platform-subscriptions/address", {
      method: "POST",
      body,
      cookie: buyerAuth.cookie,
    });
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Couldn't save that address.");
  }
}
