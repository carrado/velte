import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { getOptionalVendorAuth } from "@/lib/server/guards";

// Whose notifications a request is about (2026-09-05).
//
// These routes used to be `requireAuth()` — vendor only, because notifications
// were a vendor-only idea. Buyers have them now too (a buyer request is
// owned by either kind of account, and so is the alert that follows), so the
// session has to be resolved rather than assumed.
//
// Buyer wins when both cookies are present, the same precedence every other
// dual-session surface uses: someone reading notifications on /chat is acting
// as a buyer. A vendor in their dashboard carries no buyer cookie at all, so
// they resolve as a vendor exactly as before.
export async function notificationSession(): Promise<{
  cookie: string;
} | null> {
  const buyer = await getOptionalBuyerAuth();
  if (buyer) return { cookie: buyer.cookie };
  const vendor = await getOptionalVendorAuth();
  return vendor ? { cookie: vendor.cookie } : null;
}
