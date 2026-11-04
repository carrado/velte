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
      { error: "Sign in to verify payment." },
      { status: 401 },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    reference?: unknown;
  } | null;

  if (!body?.reference || typeof body.reference !== "string") {
    return NextResponse.json(
      { error: "Missing payment reference." },
      { status: 400 },
    );
  }

  try {
    const data = await backendData<{
      status: string;
      reference: string;
    }>("/platform-subscriptions/verify", {
      method: "POST",
      body: { reference: body.reference },
      cookie,
    });
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Couldn't verify subscription payment.");
  }
}
