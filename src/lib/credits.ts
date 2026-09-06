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
//
// ── ONE cost table, not two (2026-09-06) ────────────────────────────────
//
// A guest and a signed-in account now pay the SAME price for the same
// action — GUEST_CREDIT_COST used to be a separate, cheaper table; it is now
// just CREDIT_COST under a second name, kept only so a guest-path call site
// still reads as "this is a guest lookup" without implying a different
// price. The two tables existing at different rates (2026-09-05 through
// 2026-09-06) was an explicit pricing decision at the time; unifying them is
// an equally explicit one, made alongside dropping SIGNUP_CREDITS — a guest
// is now handed the full-size, full-price allowance up front (see
// GUEST_CREDITS below) instead of a smaller discounted one plus a bonus for
// signing in.
// ---------------------------------------------------------------------

/** Everything a buyer can spend credits on. */
export type CreditAction = "text" | "photo" | "plan";

/**
 * What every action costs — a SIGNED-IN account (buyer or vendor) and a
 * signed-OUT guest now pay the exact same price from here (2026-09-06; see
 * GUEST_CREDIT_COST below, which is this table under a second name).
 *
 * Originally calibrated (2026-08-31) against the retired ₦3,500 Velte Plus
 * bundle's own usage mix — about ₦9.6 a credit at THAT DAY's entry top-up
 * rate. The entry rate itself has since moved (creditPacks.ts's own header,
 * 2026-09-05 — the floor is now ₦50/credit), so the naira comparison here is
 * historical, not current pricing. What still holds is the RATIO between
 * actions — a photo costing a multiple of a text search is a statement about
 * relative real cost, independent of whatever a credit is worth in naira.
 */
export const CREDIT_COST: Record<CreditAction, number> = {
  /** The baseline unit. One conversational search turn. */
  text: 3,

  /** A multiple of a text turn: the buyer's image, the multimodal
   *  verification pass that checks the results are the right KIND of
   *  thing, and the comparison call. */
  photo: 8,

  /** Shopping Plan (2026-09-06) — ESTIMATE, flagged for confirmation once
   *  real [cost] lines exist (see this file's own "informed estimates" note
   *  above). This is genuinely the heaviest action in the table: N category
   *  items, each running a Velte search, a possible external gap-fill
   *  search, and a verification call — multiplied across a whole apartment's
   *  worth of categories, not one item. Priced well above `photo` for that
   *  reason, not as a round number. Unreachable by a guest in practice
   *  regardless of price — Shopping Plan is signed-in only (a multi-week,
   *  persisted commitment isn't a guest-honour-system fit), so the composer
   *  gates a signed-out tap straight to the sign-in prompt before ever
   *  checking a cost. */
  plan: 20,
};

/**
 * The SAME table, spent from the honour-system allowance in
 * lib/guestCredits.ts instead of a real server-side balance (a guest has no
 * row at all) — kept as its own name only so a guest-path call site (e.g.
 * lib/searchStream.ts) still reads as "this is a guest lookup", not because
 * the price actually differs any more. See this file's own "ONE cost table"
 * note above for why the two were unified.
 */
export const GUEST_CREDIT_COST: Record<CreditAction, number> = CREDIT_COST;

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
 * cheapest acquisition Velte has. Hence numbers that dwarf what a buyer starts
 * with (see GUEST_CREDITS — buyers no longer get a separate signup grant on
 * top of it) — a vendor with twenty listings gets twenty times that, and has
 * earned it.
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

/** Can this action be afforded at this balance, at the SIGNED-IN rate?
 *  Spelled once so the gate and any "you need N more" copy can never
 *  disagree. Not currently called anywhere — orphaned, kept accurate as
 *  documentation. A guest-specific version of this check would need
 *  GUEST_CREDIT_COST instead, never this table. */
export function canAfford(balance: number, action: CreditAction): boolean {
  return balance >= CREDIT_COST[action];
}

/** Human wording for an action, for refusals and the credit gauge. */
export const ACTION_LABEL: Record<CreditAction, string> = {
  text: "search",
  photo: "photo search",
  plan: "shopping plan",
};

/**
 * The sentence a signed-out browser sees once its free credits are gone —
 * the single most important conversion line in the product.
 *
 * LIVES HERE, not at either call site, because it is needed by BOTH the
 * client-side guest gate (lib/searchStream.ts, which deliberately never
 * calls the server) and the server-side ledger (lib/server/creditLedger.ts).
 * Those two used to hold a hand-copied sentence each, with the allowance
 * interpolated from this file but the SIGNUP GRANT typed in as a literal —
 * so when SIGNUP_CREDITS moved 15 → 10 (2026-09-05) both kept promising 15,
 * and a guest was told they'd get more than the account actually grants.
 * The old comment even claimed the numbers couldn't disagree because they
 * came from this file; only one of them did. This file is client-safe
 * precisely so a shared line like this has somewhere to live.
 */
export function guestExhaustedMessage(): string {
  return `You've used your ${GUEST_CREDITS} free credits. Sign in to top up and keep going.`;
}

/**
 * What a guest sees when the NETWORK-level backstop refuses a turn
 * (2026-09-05, see lib/server/guestNetworkGate.ts) — deliberately different
 * wording from guestExhaustedMessage above, because it is a different fact.
 * That one means "you personally used your ten"; this means "an unusual
 * amount of guest activity has come from this connection today," which can
 * be true even for someone who has never searched before on this exact
 * browser — signing in is still the honest way through it, since a real
 * account is metered on its own row rather than by address.
 */
export function guestNetworkLimitedMessage(): string {
  return `A lot of guest activity has come from this connection today, so I can't start another guest search from it right now. Create a free account to keep shopping from your own balance instead.`;
}

/** What an unidentified browser gets, once.
 *
 *  Ten (raised from 5, 2026-09-06, alongside dropping the separate
 *  SIGNUP_CREDITS bonus and unifying guest pricing with CREDIT_COST — see
 *  this file's own "ONE cost table" note above). The same number a new
 *  signed-in account used to be promised on top of a smaller, cheaper guest
 *  allowance is now simply what every guest gets up front, at the real
 *  price: three text searches, or one photo search with change — enough to
 *  watch Velte actually work before anything is asked of them, with no
 *  separate incentive needed to make signing in worthwhile.
 *
 *  Honour-system, like every guest allowance here: it lives in a cookie
 *  (moved off localStorage 2026-09-05 — see guestCredits.ts for why) and
 *  resets if the browser's data is cleared. That is fine and always has
 *  been. The number's job is to convert someone who has just watched Velte
 *  work, not to defend against someone determined to avoid signing up. */
export const GUEST_CREDITS = 10;
