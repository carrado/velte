import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { fail, getOptionalVendorAuth } from "@/lib/server/guards";

export async function POST() {
  const vendorAuth = await getOptionalVendorAuth();
  if (!vendorAuth) {
    return NextResponse.json(
      { error: "Sign in as a vendor to start the trial." },
      { status: 401 },
    );
  }
  try {
    const data = await backendData("/platform-subscriptions/trial", {
      method: "POST",
      cookie: vendorAuth.cookie,
    });
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Couldn't start the trial.");
  }
}
