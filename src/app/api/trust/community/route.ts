import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { fail, getOptionalVendorAuth } from "@/lib/server/guards";

async function sessionCookie() {
  const vendor = await getOptionalVendorAuth();
  if (vendor) return vendor.cookie;
  const buyer = await getOptionalBuyerAuth();
  return buyer?.cookie ?? null;
}

export async function GET() {
  const cookie = await sessionCookie();
  try {
    const data = await backendData("/trust/community", {
      cookie: cookie ?? undefined,
    });
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Couldn't load the community.");
  }
}

export async function POST(req: Request) {
  const audience = new URL(req.url).searchParams.get("audience");
  const cookie =
    audience === "buyer"
      ? (await getOptionalBuyerAuth())?.cookie
      : await sessionCookie();
  if (!cookie)
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const path =
    audience === "buyer"
      ? "/trust/community?audience=buyer"
      : "/trust/community";
  try {
    const data = await backendData(path, {
      method: "POST",
      body,
      cookie,
    });
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Couldn't post that.");
  }
}
