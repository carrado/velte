import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { getOptionalVendorAuth } from "@/lib/server/guards";

// Whose device a push (un)subscribe registers (2026-09-24).
//
// Buyers can register now — they are pushed the moment a vendor accepts
// their request — so these routes stopped being `requireAuth()` (vendor only).
//
// VENDOR wins when both cookies are present, the opposite of
// notificationSession's precedence, on purpose. A device holds ONE push
// endpoint and the backend keys the owner by endpoint, so whoever registers
// last owns the device. The dashboard re-registers on every open; letting a
// stray buyer cookie win there would silently move a vendor's device off
// their lead alerts — the alerts that cost them money to miss.
export async function pushSession(): Promise<{ cookie: string } | null> {
  const vendor = await getOptionalVendorAuth();
  if (vendor) return { cookie: vendor.cookie };
  const buyer = await getOptionalBuyerAuth();
  return buyer ? { cookie: buyer.cookie } : null;
}
