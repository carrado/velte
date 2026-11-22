import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { getActorAuth } from "@/lib/server/buyerGuards";
import { fail } from "@/lib/server/guards";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActorAuth();
  if (!actor) {
    return NextResponse.json(
      { error: "Sign in to apply for this gig." },
      { status: 401 },
    );
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);

  try {
    const data = await backendData(`/hub/gigs/${id}/apply?audience=buyer`, {
      method: "POST",
      body,
      cookie: actor.cookie,
    });
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Couldn't submit application.");
  }
}
