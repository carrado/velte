import { NextResponse } from "next/server";

import { fail } from "@/lib/server/guards";
import { backendFetch } from "@/lib/server/backend";

// POST /api/search/lead   (public — no buyer account, mirrors /api/search).
// Fired via navigator.sendBeacon (see reportLead.ts) the instant a buyer
// clicks "Chat on WhatsApp" on a search result card — bills the vendor's
// wallet for the lead. The response is never read by the caller (sendBeacon
// is fire-and-forget); a failure here must never surface to the buyer, who
// has already been sent on to WhatsApp by the time this resolves.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  try {
    await backendFetch("/search/lead", { method: "POST", body });
    return NextResponse.json({ success: true });
  } catch (err) {
    return fail(err, "Lead billing failed.");
  }
}
