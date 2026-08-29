import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { getOptionalVendorAuth } from "@/lib/server/guards";
import { isHighestPlan } from "@/lib/server/ai/plans";

// GET /api/usage — what plan this caller is on, what they've spent, and
// whether there is anything above them to upgrade to.
//
// Read-only and never increments (that is /usage/consume's job, called from
// the search route). Safe to render on, safe to poll.
//
// Answers for a GUEST too, rather than 401ing: the upgrade CTA and the plans
// page both ask this on every load, and a signed-out visitor is a normal,
// expected caller — not an error. They get the guest shape with no round trip.
//
// `canUpgrade` is computed HERE rather than in the client, because the plan
// table is server-only and deciding "is this the top tier?" from a hardcoded
// id in a component is exactly how that decision goes stale when a tier is
// added. See isHighestPlan.
export async function GET() {
  const buyerAuth = await getOptionalBuyerAuth();
  const vendorAuth = buyerAuth ? null : await getOptionalVendorAuth();
  const cookie = buyerAuth?.cookie ?? vendorAuth?.cookie;

  if (!cookie) {
    return NextResponse.json({
      plan: "anonymous",
      ownerType: "guest",
      periodKey: null,
      text: 0,
      photo: 0,
      // A guest has the most to gain from seeing what's on offer, so they
      // are upgradeable like anyone else who isn't already at the top.
      canUpgrade: !isHighestPlan("anonymous"),
    });
  }

  try {
    const data = await backendData<{
      plan: string;
      ownerType: "buyer" | "vendor";
      periodKey: string | null;
      text: number;
      photo: number;
    }>("/usage", { cookie });
    return NextResponse.json({
      ...data,
      canUpgrade: !isHighestPlan(data.plan),
    });
  } catch {
    // Fail SOFT, same instinct as the metering itself: a usage read that
    // can't reach the backend must not break the header it renders in. The
    // caller sees a free-tier shape, which at worst shows an upgrade CTA to
    // someone who already upgraded — recoverable, unlike a broken navbar.
    return NextResponse.json({
      plan: "free",
      ownerType: buyerAuth ? "buyer" : "vendor",
      periodKey: null,
      text: 0,
      photo: 0,
      canUpgrade: true,
    });
  }
}
