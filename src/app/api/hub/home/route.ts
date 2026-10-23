import { NextResponse } from "next/server";

import { getActorAuth, getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { backendData } from "@/lib/server/backend";
import { fail, getOptionalVendorAuth } from "@/lib/server/guards";

// The Hub home. `?scope=vendor` is the dashboard, which forwards only the
// vendor cookie so a buyer session in the same browser does not take the
// page over. `?scope=buyer` is the buyer Hub page, which forwards only the
// buyer cookie. Without a scope, either signed-in account opens the Hub.
// A guest gets 401.
export async function GET(request: Request) {
  const scope = new URL(request.url).searchParams.get("scope");
  const vendorOnly = scope === "vendor";
  const buyerOnly = scope === "buyer";
  const vendorAuth = vendorOnly ? await getOptionalVendorAuth() : null;
  const buyerAuth = buyerOnly ? await getOptionalBuyerAuth() : null;
  const actor = vendorOnly || buyerOnly ? null : await getActorAuth();
  const cookie = vendorAuth?.cookie ?? buyerAuth?.cookie ?? actor?.cookie;
  if (!cookie) {
    return NextResponse.json(
      { error: "Sign in to open the Hub.", code: "auth_required" },
      { status: 401 },
    );
  }
  try {
    const data = await backendData(
      buyerOnly ? "/hub/home?audience=buyer" : "/hub/home",
      { cookie },
    );
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Couldn't load the Hub.");
  }
}
