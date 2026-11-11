import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { fail, getOptionalVendorAuth } from "@/lib/server/guards";

export async function GET() {
  const vendorAuth = await getOptionalVendorAuth();
  if (!vendorAuth) {
    return NextResponse.json(
      { error: "Sign in as an Enterprise vendor." },
      { status: 401 },
    );
  }
  try {
    const data = await backendData("/hub/analytics", {
      cookie: vendorAuth.cookie,
    });
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Couldn't load vendor analytics.");
  }
}
