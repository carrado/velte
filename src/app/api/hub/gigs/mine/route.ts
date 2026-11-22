import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { getActorAuth } from "@/lib/server/buyerGuards";
import { fail } from "@/lib/server/guards";

export async function GET() {
  const actor = await getActorAuth();
  if (!actor) {
    return NextResponse.json(
      { error: "Sign in to view your gigs." },
      { status: 401 },
    );
  }

  try {
    const data = await backendData("/hub/gigs/mine?audience=buyer", {
      method: "GET",
      cookie: actor.cookie,
    });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return fail(err, "Couldn't fetch your gigs.");
  }
}
