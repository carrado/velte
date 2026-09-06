import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { getOptionalVendorAuth } from "@/lib/server/guards";
import { GUEST_CREDITS } from "@/lib/credits";

// GET /api/usage — this caller's credit balance.
//
// Kept at /usage rather than renamed to /credits (2026-08-31) because the
// header and the chat both already poll this path; the SHAPE changed, not the
// address. What it used to return — a plan id and a monthly counter — no
// longer exists: there are no tiers, only a balance.
//
// Read-only and never spends (that is /credits/consume's job, called from the
// search route). Safe to render on, safe to poll.
//
// Answers for a GUEST too, rather than 401ing: a signed-out visitor is a
// normal, expected caller, and the credit gauge renders for them as well. The
// balance they get back is the STARTING allowance, not their real one — a
// guest's true balance lives in their own browser storage (guestCredits.ts)
// and the server has no way to know it. The client overrides this value with
// the local one; sending it at all keeps the response shape uniform.
export async function GET() {
  const buyerAuth = await getOptionalBuyerAuth();
  const vendorAuth = buyerAuth ? null : await getOptionalVendorAuth();
  const cookie = buyerAuth?.cookie ?? vendorAuth?.cookie;

  if (!cookie) {
    return NextResponse.json({
      balance: GUEST_CREDITS,
      ownerType: "guest",
      isGuest: true,
    });
  }

  try {
    const data = await backendData<{
      balance: number;
      ownerType: "buyer" | "vendor";
      /** The VENDOR's lead-wallet balance, so the credits panel can offer to
       *  spend it without a second request. Null for a buyer, who has no
       *  wallet — which is what the panel branches on. */
      walletBalanceKobo: number | null;
      /** Lifetime spend, which is the other half of the credit meter — the
       *  ring needs a total, and `balance` alone cannot say what was
       *  granted. */
      totalSpent: number;
    }>("/credits", { cookie });
    return NextResponse.json({ ...data, isGuest: false });
  } catch {
    // Fail SOFT, the same instinct as the charging path: a balance read that
    // can't reach the backend must not break the header it renders in. Zero
    // is the honest fallback — it shows "top up" to someone who may not need
    // to, which is recoverable, where a broken navbar is not.
    return NextResponse.json({
      balance: 0,
      ownerType: buyerAuth ? "buyer" : "vendor",
      // Null rather than 0: an unknown wallet must not render as an empty one,
      // which would tell a vendor with money in it to find a card.
      walletBalanceKobo: null,
      totalSpent: 0,
      isGuest: false,
    });
  }
}
