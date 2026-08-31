// What a top-up buys (2026-08-31).
//
// Client-safe, like credits.ts, because the panel renders these and the
// checkout route reads them — one table, no mirror to drift.
//
// PRICED SO THE OLD ₦3,500 PLUS BUNDLE STILL COSTS ₦3,500. That tier bought
// 100 searches, 15 photo searches, 20 briefs, 20 watches and ~30 fair-price
// checks — about 365 credits at the costs in credits.ts. Anyone who would have
// subscribed gets the same value for the same money; only the model changed,
// which is the whole point of the switch and the thing that makes it safe to
// make.
//
// The bonus scale rewards prepaying, the same instinct as the vendor wallet's
// balance tiers — a larger top-up is better cash flow and fewer Paystack fees
// per naira.

export interface CreditPack {
  id: string;
  priceNgn: number;
  /** Total credits handed over, bonus included. */
  credits: number;
  /** How many of those are the bonus, for the badge. */
  bonus: number;
  highlight?: boolean;
}

/** The minimum top-up. Below this, Paystack's per-transaction fee eats an
 *  unreasonable share and the buyer gets too little to finish a shopping
 *  session — a top-up that runs out mid-search is worse than not offering it. */
export const MIN_TOPUP_NGN = 500;

export const CREDIT_PACKS: CreditPack[] = [
  { id: "starter", priceNgn: 500, credits: 50, bonus: 0 },
  { id: "regular", priceNgn: 1500, credits: 165, bonus: 15 },
  { id: "shopper", priceNgn: 3000, credits: 350, bonus: 50, highlight: true },
  { id: "big", priceNgn: 5000, credits: 625, bonus: 125 },
];

/** Resolves a pack id from an untrusted request body. Returns null rather than
 *  throwing so a caller can answer 400 in its own words — and NEVER trusts a
 *  price or credit count sent by the client, only the id. */
export function packFor(id: unknown): CreditPack | null {
  if (typeof id !== "string") return null;
  return CREDIT_PACKS.find((pack) => pack.id === id) ?? null;
}
