import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { fail, getOptionalVendorAuth } from "@/lib/server/guards";

export async function GET() {
  const vendorAuth = await getOptionalVendorAuth();
  if (!vendorAuth) {
    return NextResponse.json(
      { error: "Sign in as a vendor." },
      { status: 401 },
    );
  }
  try {
    const data = await backendData("/hub/adverts/mine", {
      cookie: vendorAuth.cookie,
    });
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Couldn't load your adverts.");
  }
}

export async function POST(req: Request) {
  const vendorAuth = await getOptionalVendorAuth();
  if (!vendorAuth) {
    return NextResponse.json(
      { error: "Sign in as a vendor." },
      { status: 401 },
    );
  }
  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  try {
    const data = await backendData("/hub/adverts", {
      method: "POST",
      body: body ?? {},
      cookie: vendorAuth.cookie,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return fail(err, "Couldn't place this advert.");
  }
}
