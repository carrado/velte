import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { fail, getOptionalVendorAuth } from "@/lib/server/guards";

export async function POST(req: Request) {
  const vendorAuth = await getOptionalVendorAuth();
  const buyerAuth = vendorAuth ? null : await getOptionalBuyerAuth();
  const cookie = vendorAuth?.cookie ?? buyerAuth?.cookie;
  if (!cookie) {
    return NextResponse.json(
      { error: "Sign in to subscribe." },
      { status: 401 },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    interval?: unknown;
    plan?: unknown;
  } | null;
  const interval = body?.interval === "annual" ? "annual" : "monthly";

  try {
    const data = await backendData<{
      authorizationUrl: string;
      reference: string;
      amountKobo: number;
    }>("/platform-subscriptions/checkout", {
      method: "POST",
      body: { interval, plan: body?.plan },
      cookie,
    });
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Couldn't start the payment.");
  }
}
