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
      { error: "Sign in to verify your NIN." },
      { status: 401 },
    );
  }
  const body = (await req.json().catch(() => null)) as { nin?: unknown } | null;
  try {
    const data = await backendData<{ url: string }>(
      "/platform-subscriptions/nin",
      {
        method: "POST",
        body,
        cookie,
      },
    );
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Identity verification is not available yet.");
  }
}
