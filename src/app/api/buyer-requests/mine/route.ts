import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { fail } from "@/lib/server/guards";
import { getActorAuth } from "@/lib/server/buyerGuards";
import type { MyBuyerRequest } from "@/types/buyerRequest";

// GET /api/buyer-requests/mine — the requests THIS caller has sent out.
//
// Either session (2026-09-27): a vendor posts requests too, and /chat/requests
// is where they read their own back — the requests referred TO a vendor from
// other people's buyers are the dashboard's own page and a different shape
// entirely (/api/vendor/buyer-requests). Which id this reads is the backend's
// call (resolveActor's), so both cookies are forwarded rather than one
// picked here.
//
// An anonymous caller gets an empty list rather than a 401. The page it
// feeds renders its own sign-in prompt, so a 401 here would only turn a
// designed empty state into a red error toast.
export async function GET() {
  const auth = await getActorAuth();
  if (!auth) return NextResponse.json({ requests: [] });

  try {
    const data = await backendData<{ requests: MyBuyerRequest[] }>(
      "/buyer-requests/mine",
      { cookie: auth.cookie },
    );
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Couldn't load your requests.");
  }
}
