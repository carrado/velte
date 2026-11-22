import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { getActorAuth } from "@/lib/server/buyerGuards";
import { fail } from "@/lib/server/guards";
import { assetRef } from "@/lib/server/posterProxy";

export async function GET() {
  const actor = await getActorAuth();
  if (!actor)
    return NextResponse.json(
      { error: "Sign in to view your adverts." },
      { status: 401 },
    );
  try {
    const rawData = await backendData<any[]>(
      "/hub/buyer-adverts/mine?audience=buyer",
      {
        method: "GET",
        cookie: actor.cookie,
      },
    );
    const list = Array.isArray(rawData) ? rawData : [];
    // Protect advert media: obfuscate raw Cloudinary URLs with opaque encrypted tokens
    const data = list.map((ad: any) => ({
      ...ad,
      imageUrl: ad.imageUrl ? assetRef(ad.imageUrl) : ad.imageUrl,
    }));
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return fail(err, "Couldn't fetch your sponsored adverts.");
  }
}

export async function POST(req: Request) {
  const actor = await getActorAuth();
  if (!actor)
    return NextResponse.json(
      { error: "Sign in to place an advert." },
      { status: 401 },
    );
  const body = await req.json().catch(() => null);
  try {
    const data = await backendData("/hub/buyer-adverts?audience=buyer", {
      method: "POST",
      body,
      cookie: actor.cookie,
    });
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Couldn't place that advert.");
  }
}
