// What a top-up buys (2026-08-31, floor raised 2026-09-05 then revised
// twice more the same day — see the credit count/price history below).
//
// Client-safe, like credits.ts, because the panel renders these and the
// checkout route reads them — one table, no mirror to drift.
//
// REBUILT 2026-09-05 around an explicit floor, moved twice: first 30
// credits/₦2,500, then "build from ₦1,500 up" (which landed on 15 credits,
// a freshly-chosen ₦100/credit rate, since no credit count was given that
// time), then explicitly corrected to 30 credits AT ₦1,500 — so the floor
// is now the same 30 CREDITS as the very first version, just at 60% of the
// price (₦50/credit instead of ₦83.33). Every number here is either that
// direct instruction or DESIGNED to keep the same shape the ladder has had
// throughout every revision:
//   - a clean, round base rate — ₦50/credit with no bonus, i.e. exactly
//     what 30-for-₦1,500 implies — never mechanically carried over from a
//     previous revision's rate;
//   - the same bonus-percentage curve every version of this ladder has
//     used (0% / 10% / 16.67% / 25%), rewarding a bigger top-up with a
//     better rate — same instinct as the vendor wallet's own balance
//     tiers, and what keeps every tier strictly better value than the one
//     below it (never a smaller/cheaper pack worth less per credit than a
//     bigger one);
//   - prices doubling tier to tier (₦1,500 / 3,000 / 6,000 / 12,000) for
//     round, memorable top-up amounts.
// The old ₦3,500-Plus-bundle anchor this file used to price against no
// longer applies at this floor — nothing here is calibrated against it any
// more.
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

/** The minimum top-up — the floor pack's own price. Below this, Paystack's
 *  per-transaction fee eats an unreasonable share and the buyer gets too
 *  little to finish a shopping session — a top-up that runs out mid-search
 *  is worse than not offering it. */
export const MIN_TOPUP_NGN = 1500;

export const CREDIT_PACKS: CreditPack[] = [
  { id: "starter", priceNgn: 1500, credits: 30, bonus: 0 },
  { id: "regular", priceNgn: 3000, credits: 66, bonus: 6 },
  { id: "shopper", priceNgn: 6000, credits: 140, bonus: 20, highlight: true },
  { id: "big", priceNgn: 12000, credits: 300, bonus: 60 },
];

/** Resolves a pack id from an untrusted request body. Returns null rather than
 *  throwing so a caller can answer 400 in its own words — and NEVER trusts a
 *  price or credit count sent by the client, only the id. */
export function packFor(id: unknown): CreditPack | null {
  if (typeof id !== "string") return null;
  return CREDIT_PACKS.find((pack) => pack.id === id) ?? null;
}
