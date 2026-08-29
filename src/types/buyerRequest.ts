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
  // Present only once THIS vendor has accepted — omitted by the backend
  // entirely before that (see vendorBuyerRequests.controller.js's
  // withGatedPhone), so its mere presence is the accept signal, no separate
  // flag needed to know whether to show it.
  // NOT sent to the browser (2026-08-27). The backend gates it on this
  // vendor having accepted, but the BFF strips it even then: a number in the
  // client payload ends up in the DOM and in a wa.me href, where it is
  // readable from the hover status bar and from "copy link address".
  // Chatting goes through /api/vendor/buyer-requests/:id/chat, which
  // resolves it server-side and redirects.
  //
  // Still declared because the SERVER reads it off the backend response —
  // that chat route is its only consumer.
  buyerPhone?: string;
  // What the client gets instead: whether this vendor may chat yet. Derived
  // in the BFF from the presence of the gated number above.
  canChat?: boolean;
  description: string;
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
}
