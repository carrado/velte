import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { fail, getOptionalVendorAuth } from "@/lib/server/guards";
import { broadcastHubEvent } from "@/server/hubWsServer";
import { proxyImageUrl } from "@/lib/server/posterProxy";

export async function GET() {
  const vendorAuth = await getOptionalVendorAuth();
  if (!vendorAuth) {
    return NextResponse.json([]);
  }
  try {
    const raw = await backendData("/hub/adverts/mine", {
      cookie: vendorAuth.cookie,
    });
    // Proxy advert image URLs
    const data = Array.isArray(raw)
      ? raw.map((ad: Record<string, unknown>) => ({
          ...ad,
          ...(ad.imageUrl != null
            ? { imageUrl: proxyImageUrl(ad.imageUrl as string) }
            : {}),
        }))
      : raw;
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
    broadcastHubEvent({ type: "HUB_DATA_CHANGED", scope: "adverts" });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return fail(err, "Couldn't place this advert.");
  }
}
