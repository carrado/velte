// A buyer's price watch, as the API returns it. Mirrors velte-backend's
// PriceWatch model — see that file for why the two kinds exist and how each
// is re-checked.
export interface PriceWatch {
  _id: string;
  kind: "velte" | "external";
  productId: string | null;
  url: string | null;
  label: string;
  imageUrl: string | null;
  merchant: string | null;
  /** Kobo. What it cost when the watch started — the number that makes
   *  "₦81,000 less than when you saved it" possible. */
  startPriceKobo: number;
  /** Kobo. Most recent price seen by a check. */
  lastPriceKobo: number;
  /** Kobo, or null for "alert on any drop". */
  targetPriceKobo: number | null;
  status: "active" | "paused" | "ended";
  lastCheckedAt: string | null;
  lastNotifiedAt: string | null;
  createdAt: string;
}
