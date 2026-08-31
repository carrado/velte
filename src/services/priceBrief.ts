import { buyerApi } from "@/lib/buyer-api-client";
import type { NegotiationBrief, PriceBand } from "@/types/search";

// The negotiation brief's client half (2026-08-31).
//
// buyerApi rather than `api`, like every other /chat call: api-client's global
// 401 handler clears a VENDOR session and bounces to /auth/login, which would
// log a vendor out of their dashboard for pressing a button in the buyer chat.
// See buyer-api-client's own note.

/** What the route answers when the balance won't cover it — a 200, not an
 *  error, because an empty balance is a normal outcome and the UI turns it
 *  into an offer rather than a failure. */
export interface BriefRefusal {
  /** Written server-side so the wording of "you can't afford this" lives in
   *  one place — see creditLedger.ts's creditMessage. */
  message: string;
  /** What they have, and what it costs. Enough for a meter without a second
   *  request. */
  balance: number;
  cost: number;
  isGuest: boolean;
}

export interface BriefResponse {
  brief: NegotiationBrief | null;
  refusal: BriefRefusal | null;
}

/** Asks for a brief, spending one of the account's allowance.
 *
 *  The band is echoed back to the server rather than looked up there — see the
 *  route's own note on why that trade is safe here. */
export function fetchNegotiationBrief(band: PriceBand): Promise<BriefResponse> {
  return buyerApi.post<BriefResponse>("/api/price-brief", { band });
}
