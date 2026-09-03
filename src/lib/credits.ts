// ---------------------------------------------------------------------
// Velte credits — the single source of truth for what every action costs
// and what every grant is worth (2026-08-31).
//
// CLIENT-SAFE, deliberately, and it has to be: the guest gate runs entirely in
// the browser and the credit gauge renders there. The old plan table was
// server-only and needed a client-side mirror (planAllowances.ts) that could
// drift from it; there is nothing secret in a price list, so this one file is
// imported by both halves and there is no second copy to keep in step.
//
// Replaces the tiered plan table. The reason is behavioural, not technical:
// people shop when they NEED something, not on a monthly cycle, so a
// subscription charges most of its users in months they never opened the
// app. Credits are the shape Nigerians already use for airtime and data —
// top up when you need it, see what you have left, spend it down.
//
// ── The rule that shapes every number below ─────────────────────────────
//
// THE RATIOS ARE THE COST CONTROL, not the naira price. A photo search
// costing 5x a text search is what stops the cheapest purchase buying the
// most expensive traffic — the job the old tier system did with separate
// per-kind quotas. Because credits are fungible, a buyer will always drift
// toward whatever action is underpriced relative to what it really costs us,
// so a wrong ratio leaks money quietly and forever.
//
// ⚠ THESE RATIOS ARE INFORMED ESTIMATES, NOT MEASUREMENTS. Every search turn
// already emits a `[cost]` line (server/ai/usage.ts) and `npm run costs`
// analyses them — that has never been run on real traffic. Do it before
// treating any number here as settled. The naira price of a credit can change
// any day; the ratios are the part that has to be right.
// ---------------------------------------------------------------------

/** Everything a buyer can spend credits on. */
export type CreditAction = "text" | "photo" | "band" | "brief" | "watch";

/**
 * What each action costs.
 *
 * Calibrated so that the retired ₦3,500 Velte Plus bundle (100 searches, 15
 * photo searches, 20 briefs, 20 watches, ~30 fair-price checks) comes to ~365
 * credits — i.e. about ₦9.6 a credit at the entry top-up rate. Anyone who
 * would have bought Plus gets the same value for the same money; only the
 * model changed.
 */
export const CREDIT_COST: Record<CreditAction, number> = {
  /** The baseline unit. One conversational search turn. */
  text: 1,

  /** Five, because a photo turn is genuinely a multiple of a text one: the
   *  buyer's image, the multimodal verification pass that checks the results
   *  are the right KIND of thing, and the comparison call. It is also what
   *  keeps photo search out of a guest's reach without a special rule — see
   *  GUEST_CREDITS. */
  photo: 5,

  /** One. No LLM at all, but it is what pulls external listings, and
   *  Serper's free tier is 2,500 calls a month for the WHOLE platform —
   *  which makes this, not the model bill, the real ceiling on fair-price
   *  checks. Priced low anyway because it is the hook: it is the reason to
   *  open Velte before paying for anything. */
  band: 1,

  /** Three. Costs nothing at all to serve — pure arithmetic over listings the
   *  turn already fetched — so this is priced on VALUE, not cost, exactly as
   *  price watches are. It is the thing people will pay for. */
  brief: 3,

  /** Five, for thirty days of watching. About 240 page fetches and no LLM, so
   *  cheap to serve; the price reflects that a drop alert catching ₦80,000 is
   *  worth many multiples of it. */
  watch: 5,
};

/** What a signed-in buyer gets on creating an account. ONE-OFF — there is no
 *  monthly reset anywhere in this system, deliberately. Fifteen is enough to
 *  run a real shopping session (a dozen searches, a couple of fair-price
 *  checks and a brief) and see the product work before being asked for money.
 *
 *  Deliberately three times the guest allowance: signing in has to visibly
 *  buy something, or the prompt is just a toll gate. */
export const SIGNUP_CREDITS = 15;

/** What a buyer gets when someone they referred creates an account.
 *
 *  The only valve in a system with no monthly reset: it lets an engaged buyer
 *  keep going without us handing out free credits on a timer, and it costs
 *  nothing we weren't already willing to spend acquiring that second buyer. */
export const REFERRAL_CREDITS = 5;

/**
 * What a VENDOR starts with, by how much of a catalogue they have uploaded
 * (2026-08-31).
 *
 * A vendor is not a buyer with a different cookie: they arrive having already
 * done work for Velte. Every offering they list is what the discovery engine
 * matches against, so a deep catalogue is the most valuable thing a vendor can
 * give us, and paying for it in the currency they will spend on search is the
 * cheapest acquisition Velte has. Hence numbers that dwarf a buyer's
 * SIGNUP_CREDITS — a vendor with twenty listings gets more than thirteen times
 * what a buyer gets for signing up, and has earned it.
 *
 * TARGETS, not increments: a vendor holds whatever their tier says, so
 * crossing 10 or 20 tops them up by the difference rather than re-paying what
 * they already have. Someone who joins with three listings and grows to twenty
 * ends on 200, exactly as if they had arrived with twenty — which is what makes
 * this an ongoing reason to keep listing rather than a one-shot at whatever
 * moment we happened to count.
 *
 * DISPLAY ONLY on this side. The amounts are actually applied by velte-backend
 * (config/credits.js VENDOR_CATALOG_GRANTS + syncVendorCatalogCredits), because
 * a grant that arrived from the client would be a grant the client could
 * choose. Keep the two in step; this file is what a vendor is PROMISED, that
 * one is what they GET.
 *
 * Ordered highest-first so a linear scan returns on the first tier a count
 * clears — the same shape as LEAD_TIERS in services/wallet.ts.
 */
export const VENDOR_CATALOG_GRANTS: {
  minOfferings: number;
  credits: number;
}[] = [
  { minOfferings: 20, credits: 200 },
  { minOfferings: 10, credits: 100 },
  { minOfferings: 0, credits: 50 },
];

/** The grant a vendor with this many offerings has earned. Never undefined —
 *  the last tier's floor is 0, so an empty catalogue still starts with
 *  something to spend. */
export function catalogGrantFor(count: number): number {
  const tier =
    VENDOR_CATALOG_GRANTS.find((t) => count >= t.minOfferings) ??
    VENDOR_CATALOG_GRANTS[VENDOR_CATALOG_GRANTS.length - 1];
  return tier.credits;
}

/** Can this action be afforded at this balance? Spelled once so the gate and
 *  any "you need N more" copy can never disagree. */
export function canAfford(balance: number, action: CreditAction): boolean {
  return balance >= CREDIT_COST[action];
}

/** Human wording for an action, for refusals and the credit gauge. */
export const ACTION_LABEL: Record<CreditAction, string> = {
  text: "search",
  photo: "photo search",
  band: "fair-price check",
  brief: "negotiation brief",
  watch: "price watch",
};

/** What an unidentified browser gets, once.
 *
 *  Five, and the number does a second job for free: a photo search costs 5 and
 *  a text search costs 1, so a guest who has done anything at all can no
 *  longer afford a photo search. Photo stays the sign-in hook it has always
 *  been, without a special rule saying so — the pricing enforces it.
 *
 *  Honour-system, like every guest allowance here: it lives in localStorage
 *  and resets if the browser is cleared. That is fine and always has been.
 *  The number's job is to convert someone who has just watched Velte work,
 *  not to defend against someone determined to avoid signing up. */
export const GUEST_CREDITS = 5;
