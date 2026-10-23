import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { fail, getOptionalVendorAuth } from "@/lib/server/guards";

// Signed-in Hub timeline — vendor or buyer session (a vendor browsing on
// /chat resolves through either cookie, same as the subscriptions checkout).
// Guests get a 401 and the locked sheet, never the feed.
export async function GET() {
  const vendorAuth = await getOptionalVendorAuth();
  const buyerAuth = vendorAuth ? null : await getOptionalBuyerAuth();
  const cookie = vendorAuth?.cookie ?? buyerAuth?.cookie;
  if (!cookie) {
    return NextResponse.json(
      { error: "Sign in to open the Hub." },
      { status: 401 },
    );
  }
  try {
    const data = await backendData("/hub/feed", { cookie });
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Couldn't load the Hub.");
  }
}
