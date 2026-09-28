// What a top-up buys — ONE rate, any amount (2026-09-28).
//
// The four-pack ladder this file used to hold (₦1,500/30, ₦3,000/66, …) is
// gone, replaced by a plain amount input and a formula. The buyer names any
// figure at or above the floor and gets credits in proportion, rounded to the
// nearest whole credit — so there is no pack to pick between and nothing to
// compare, exactly the reasoning that retired the subscription tiers before it.
//
// THE RATE IS THE FLOOR: ₦2,000 buys 30 credits, and every other amount is a
// straight multiple of that (₦4,000 → 60, ₦5,000 → 75). No bonus curve, no
// "better value the more you buy" — the ladder's whole point was to reward a
// bigger prepay, and with a free amount field there is no fixed rung for a
// bonus to attach to.
//
// Client-safe, like credits.ts, because the panel renders the live estimate as
// the buyer types and the checkout route reads the same numbers — one table,
// no mirror to drift. The CHARGE is still built on the server (velte-backend
// config/creditPacks.js), so an amount that arrives from a client is only ever
// a REQUEST: the credits it buys are computed there, never sent up.

/** The minimum top-up, and the amount the rate is defined against. Below this
 *  Paystack's per-transaction fee eats an unreasonable share and the buyer
 *  gets too little to finish a shopping session — a top-up that runs out
 *  mid-search is worse than not offering it. */
export const MIN_TOPUP_NGN = 2000;

/** What the floor buys. The rate below is derived from these two together, so
 *  changing either moves every amount with it. */
export const CREDITS_AT_MIN_TOPUP = 30;

/** Credits per naira, at one flat rate for everyone and every amount. */
export const CREDITS_PER_NAIRA = CREDITS_AT_MIN_TOPUP / MIN_TOPUP_NGN;

/** A ceiling on a single top-up, to bound the credits integer a request can
 *  ask for. Generous — well above any real one-off purchase — so it only ever
 *  catches a nonsense figure, not a large legitimate one. */
export const MAX_TOPUP_NGN = 500000;

/**
 * The credits `amountNgn` buys, rounded to the nearest whole credit. Returns 0
 * below the floor, which is what the panel's own "minimum is ₦2,000" message
 * keys off — the same figure the backend refuses on, computed the same way.
 */
export function creditsForAmount(amountNgn: number): number {
  if (!Number.isFinite(amountNgn) || amountNgn < MIN_TOPUP_NGN) return 0;
  return Math.round(amountNgn * CREDITS_PER_NAIRA);
}
