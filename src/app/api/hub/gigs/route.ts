import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { getActorAuth } from "@/lib/server/buyerGuards";
import { fail } from "@/lib/server/guards";
import { proxyImageUrl, proxyImageUrls } from "@/lib/server/posterProxy";

/** Proxy all image URLs in a gig object before it reaches the client. */
function proxyGigImages(gig: Record<string, unknown>): Record<string, unknown> {
  return {
    ...gig,
    ...(gig.imageUrl != null
      ? { imageUrl: proxyImageUrl(gig.imageUrl as string) }
      : {}),
    ...(Array.isArray(gig.images)
      ? { images: proxyImageUrls(gig.images as string[]) }
      : {}),
    ...(gig.posterUrl != null
      ? { posterUrl: proxyImageUrl(gig.posterUrl as string) }
      : {}),
    ...(gig.thumbnailUrl != null
      ? { thumbnailUrl: proxyImageUrl(gig.thumbnailUrl as string) }
      : {}),
  };
}

export async function GET(req: Request) {
  const actor = await getActorAuth();
  const { searchParams } = new URL(req.url);
  const query = searchParams.toString();
  const path = query ? `/hub/gigs?${query}` : "/hub/gigs";

  try {
    const raw = await backendData(path, {
      method: "GET",
      cookie: actor?.cookie,
    });
    // Proxy images for each gig item
    const data = Array.isArray(raw) ? raw.map(proxyGigImages) : raw;
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return fail(err, "Couldn't load gigs.");
  }
}

export async function POST(req: Request) {
  const actor = await getActorAuth();
  if (!actor) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);

  try {
    const data = await backendData("/hub/gigs", {
      method: "POST",
      body,
      cookie: actor.cookie,
    });
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Couldn't create gig.");
  }
}
