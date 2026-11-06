import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { getActorAuth } from "@/lib/server/buyerGuards";
import { fail } from "@/lib/server/guards";

export async function POST(req: Request) {
  const actor = await getActorAuth();
  if (!actor)
    return NextResponse.json(
      { error: "Sign in to queue a broadcast." },
      { status: 401 },
    );
  const body = await req.json().catch(() => null);
  try {
    const data = await backendData("/hub/buyer-broadcasts?audience=buyer", {
      method: "POST",
      body,
      cookie: actor.cookie,
    });
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Couldn't queue that broadcast.");
  }
}
