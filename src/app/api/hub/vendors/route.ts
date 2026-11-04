import { NextResponse } from "next/server";

import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { backendData } from "@/lib/server/backend";
import { fail, getOptionalVendorAuth } from "@/lib/server/guards";

// Buyer vendor directory. Prefer the buyer cookie so a linked vendor session
// still sees the buyer Hub directory (same as /api/hub/home?scope=buyer).
export async function GET() {
  const buyer = await getOptionalBuyerAuth();
  const vendor = buyer ? null : await getOptionalVendorAuth();
  const cookie = buyer?.cookie ?? vendor?.cookie;
  if (!cookie) {
    return NextResponse.json(
      { error: "Sign in to open the Hub.", code: "auth_required" },
      { status: 401 },
    );
  }
  try {
    const data = await backendData(
      buyer ? "/hub/vendors?audience=buyer" : "/hub/vendors",
      { cookie },
    );
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Couldn't load vendors.");
  }
}
