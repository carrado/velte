import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { fail } from "@/lib/server/guards";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import type { MyBuyerRequest } from "@/types/buyerRequest";

// GET /api/buyer-requests/mine — the requests THIS buyer has sent out.
//
// Buyer session only: a request is owned by the Buyer document that
// created it (`buyerId`), and a vendor cookie identifies a different
// collection entirely. A vendor's own view of the requests they were
// matched to is a different page with a different shape —
// /api/vendor/buyer-requests.
//
// An anonymous caller gets an empty list rather than a 401. The page it
// feeds renders its own sign-in prompt, so a 401 here would only turn a
// designed empty state into a red error toast.
export async function GET() {
  const auth = await getOptionalBuyerAuth();
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
