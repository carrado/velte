import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { fail } from "@/lib/server/guards";

async function cookie() {
  const buyer = await getOptionalBuyerAuth();
  return buyer?.cookie ?? null;
}

export async function GET() {
  const session = await cookie();
  if (!session)
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  try {
    const data = await backendData("/trust/saved-searches", {
      cookie: session,
    });
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Couldn't load saved searches.");
  }
}

export async function POST(req: Request) {
  const session = await cookie();
  if (!session)
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json().catch(() => null);
  try {
    const data = await backendData("/trust/saved-searches", {
      method: "POST",
      body,
      cookie: session,
    });
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Couldn't save that search.");
  }
}
