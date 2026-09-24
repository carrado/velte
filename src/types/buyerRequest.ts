export type BuyerRequestStatus =
  | "active"
  | "fulfilled"
  | "expired"
  | "cancelled";

export type BuyerRequestDecision = "accepted" | "declined";

export interface BuyerRequest {
  id: string;
  // Null when the buyer had no account (2026-08-27) — verifying a phone
  // stopped creating one, so most requests legitimately have no buyer
  // behind them. Nothing vendor-facing reads it; name and number live on
  // the request's own snapshot.
  buyerId: string | null;
  buyerName: string;
  description: string;
  // Kobo, or null when the buyer skipped it. A vendor sees this BEFORE
  // deciding whether to accept, which is the whole point of it being a field
  // rather than a phrase inside `description` — accepting costs them a lead
  // fee, and this is the number that tells them whether it is worth it.
  budgetKobo: number | null;
  imageUrl: string | null;
  // "N/A" on the vendor-facing detail page when this is absent — the buyer
  // simply didn't grant location for this request; there's no saved
  // location to fall back to (buyers don't have accounts).
  location?: { type: "Point"; coordinates: [number, number] } | null;
  status: BuyerRequestStatus;
  matchedVendorIds: string[];
  responseCount: number;
  lastResponseAt: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  // This vendor's own decision on this request — null until they accept or
  // decline (see GET /api/vendor/buyer-requests and its /:id counterpart).
  myDecision: BuyerRequestDecision | null;
  // How many matched businesses have accepted so far — every business
  // counts, not just this one. Stored on the request document, so both
  // vendor endpoints already send it; optional for older payloads.
  acceptedCount?: number;
  // This vendor's own quote — null unless they accepted (2026-09-24).
  myQuote?: BuyerRequestQuote | null;
  // When the buyer messaged THIS vendor from their requests page — i.e. the
  // vendor won the request. Null otherwise, and null for anything contacted
  // before the backend started recording it (2026-09-24).
  myContactedAt?: string | null;
}

// ── The BUYER's own view of a request (2026-08-30) ──────────────────────────
// GET /api/buyer-requests/mine. A different shape from the vendor-facing
// BuyerRequest above, deliberately, because the two audiences need opposite
// halves of the same row: a vendor needs the buyer's identity and this
// vendor's own decision; a buyer needs who accepted and what to do next.
// Neither is a subset of the other, so they stay separate types rather than
// one with half its fields optional.

/** A vendor who ACCEPTED — i.e. paid for the lead and now has the buyer's
 *  number. Declines never appear here; they release nothing and cost the
 *  vendor nothing, so showing them would only read as a rejection. */
export interface BuyerRequestResponder {
  vendorId: string;
  /** Store name where there is one, business name otherwise. */
  name: string;
  avatar: string | null;
  /** null when the vendor has no Store row yet (created lazily on their
   *  first dashboard visit) — the card then shows them without a link
   *  rather than dropping them. */
  storeHandle: string | null;
  area: string | null;
  state: string | null;
  respondedAt: string;

  // ── The quote (2026-09-03) ────────────────────────────────────────────
  // What the vendor said they'd do it for. All three are null when they
  // accepted without naming terms, which is a normal and permitted outcome —
  // see BuyerRequestResponse.model.js on why quoting isn't mandatory.
  //
  // VENDOR-STATED. This is their own claim about their own price; Velte
  // neither sets nor verifies it, and the comparison never blends it with
  // any outside market figure.
  /** Kobo. */
  priceKobo: number | null;
  /** Days until they can supply. 0 is "available now" — distinct from null,
   *  which is "didn't say". */
  leadTimeDays: number | null;
  /** Warranty, delivery, condition — whatever the price alone doesn't say. */
  note: string | null;
}

export interface MyBuyerRequest {
  id: string;
  buyerName: string;
  description: string;
  /** Kobo, or null when skipped — echoed back so the buyer can see what
   *  businesses were quoting against. */
  budgetKobo: number | null;
  imageUrl: string | null;
  location?: { type: "Point"; coordinates: [number, number] } | null;
  /** Already aged forward server-side: an "active" row past its expiresAt
   *  comes back as "expired" even before the expiry cron has swept it. */
  status: BuyerRequestStatus;
  /** How many businesses the request was sent to. `matchedVendorIds` itself
   *  is stripped by the backend — a buyer has no use for vendor ids, and it
   *  is the vendor network laid bare. */
  matchedVendorCount: number;
  /** Accepted only — the number the page actually acts on. Distinct from
   *  `responseCount`, which counts declines too. */
  acceptedCount: number;
  /** How many of those actually named a price. Distinct from acceptedCount:
   *  "3 accepted, 2 quoted" is the honest headline, and a page that showed
   *  only the first number would promise a comparison it can't draw. */
  quotedCount: number;
  responders: BuyerRequestResponder[];
  responseCount: number;
  lastResponseAt: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface MyBuyerRequestList {
  requests: MyBuyerRequest[];
}

/** How the buyer's "Your requests" page reads a request (RequestsPage.tsx) —
 *  derived, never stored. "offers": still open and at least one business
 *  accepted, so the next move is the buyer's. "contacted": the buyer
 *  messaged someone (stored status `fulfilled`). */
export type BuyerRequestTone = "offers" | "open" | "contacted" | "closed";

/** The page's sections, in display order. */
export type BuyerRequestSectionId = "offers" | "waiting" | "past";

/** A vendor's terms on an accepted request — all three optional, since
 *  accepting without quoting is allowed. Money in kobo. */
export interface BuyerRequestQuote {
  priceKobo: number | null;
  leadTimeDays: number | null;
  note: string | null;
}

/** Where a request stands for the vendor looking at it (lib/
 *  vendorRequestOutcome.ts):
 *  - new       open, not yet answered
 *  - awaiting  open, they sent an offer, the buyer hasn't picked anyone
 *  - won       the buyer messaged THEM
 *  - lost      they sent an offer, the buyer messaged another business
 *  - closed    ended without a pick (expired or cancelled)
 *  - declined  they passed on it */
export type VendorRequestOutcome =
  | "new"
  | "awaiting"
  | "won"
  | "lost"
  | "closed"
  | "declined";

/** The vendor list page's tabs (/{id}/buyer-requests). "past" holds lost,
 *  closed and declined. */
export type VendorRequestTab = "new" | "awaiting" | "won" | "past";
