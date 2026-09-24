import { msLeft } from "@/lib/requestWindow";
import type {
  BuyerRequest,
  VendorRequestOutcome,
  VendorRequestTab,
} from "@/types/buyerRequest";

// Where a Buyer Request stands for the vendor looking at it — shared by the
// vendor list page, the detail page and the nav badge so the three can never
// disagree (2026-09-24, the vendor page's history).
//
// "won" is checked first: the buyer messaging a vendor also flips the whole
// request to `fulfilled`, so status alone can't tell winning from losing —
// only this vendor's own myContactedAt can.
/** When the backend started recording WHICH business a buyer messaged
 *  (BuyerRequestResponse.contactedAt). A request fulfilled before this has
 *  no record either way, so "the buyer picked someone else" can't be
 *  claimed for it — it reads as plain "closed" instead. Requests created
 *  after it always have the record (their whole window falls after it). */
const CONTACT_TRACKING_SINCE = Date.parse("2026-09-24T00:00:00Z");

export function vendorRequestOutcome(
  request: BuyerRequest,
  now: number,
): VendorRequestOutcome {
  if (request.myDecision === "declined") return "declined";
  if (request.myContactedAt) return "won";
  const open =
    request.status === "active" && msLeft(request.expiresAt, now) > 0;
  if (request.myDecision === "accepted") {
    if (open) return "awaiting";
    const tracked =
      new Date(request.createdAt).getTime() >= CONTACT_TRACKING_SINCE;
    return request.status === "fulfilled" && tracked ? "lost" : "closed";
  }
  return open ? "new" : "closed";
}

export function vendorRequestTab(
  outcome: VendorRequestOutcome,
): VendorRequestTab {
  if (outcome === "new" || outcome === "awaiting" || outcome === "won") {
    return outcome;
  }
  return "past";
}
