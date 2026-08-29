// ---------------------------------------------------------------------
// Velte buyer plans — the single source of truth for tiers, prices and
// quotas (2026-08-29).
//
// Everything that meters or paywalls a buyer reads from here: the
// /api/search gate, the backend's atomic check-and-increment (which is
// handed the limit from this file rather than keeping its own copy — see
// usage.ts for why that's safe), and any pricing UI. One table, so a
// price can never disagree with what's actually enforced.
//
// ⚠ THE NUMBERS BELOW ARE PROVISIONAL. They are informed guesses made
// BEFORE any real cost data existed. The instrumentation added on
// 2026-08-28 (usage.ts + `npm run costs`) is what turns them into decisions
// — run it over a week of real traffic and tune `quotas` against measured
// cost-to-serve before charging anyone. The structure here is meant to
// outlive the numbers.
//
// The economic rule that shaped the split, and the one worth preserving
// through any retune: Velte's revenue is NAIRA and fixed; its LLM costs are
// DOLLARS and per-use. So a flat monthly price with a generous allowance
// carries unbounded downside — every quota below is a real cap, and the
// expensive things are capped hardest.
// ---------------------------------------------------------------------

/** What a turn is metered as. Photo turns are separated because they cost a
 *  multiple of a text turn — the buyer's image, plus the multimodal
 *  verification and comparison calls — so bundling them into one "search"
 *  allowance would let the cheapest plan buy the most expensive traffic. */
export type MeteredKind = "text" | "photo";

export type PlanId = "anonymous" | "free" | "plus" | "business";

export interface Plan {
  id: PlanId;
  /** Shown to buyers. */
  name: string;
  /** ₦/month. 0 for the two free tiers. */
  priceNgnMonthly: number;
  /** ₦/year where an annual option exists — prepaid, which dodges the
   *  failed-renewal churn that kills recurring card billing in this market.
   *  null where the tier has no annual form. */
  priceNgnYearly: number | null;
  /** Whether a buyer must be signed in to be on this tier at all. */
  requiresAccount: boolean;
  quotas: Record<MeteredKind, number>;
  /** Price watches allowed. 0 = the feature is off for this tier. The
   *  headline paid feature: cheap to serve (page fetches, no LLM) and
   *  genuinely valuable, which is the right shape for a subscription —
   *  unlike searches, which are the opposite on both counts. */
  priceWatches: number;
  /** Saved lists; -1 means unlimited. */
  savedLists: number;
  /** How far back conversation history stays readable. -1 = forever. */
  historyDays: number;
}

export const PLANS: Record<PlanId, Plan> = {
  // Not a product tier — what an unidentified browser gets. Deliberately
  // enough to feel what Velte does and not a search more, because a
  // deviceId is trivially reset by clearing storage, so this can never be
  // properly enforced and must never be worth farming.
  //
  // Photo search is ZERO here on purpose. It's both the most expensive turn
  // to serve and the most impressive one, which makes "sign in to search
  // with a photo" the single best-placed signup prompt in the product —
  // it converts at the exact moment the buyer wants something.
  anonymous: {
    id: "anonymous",
    name: "Guest",
    priceNgnMonthly: 0,
    priceNgnYearly: null,
    requiresAccount: false,
    quotas: { text: 3, photo: 0 },
    priceWatches: 0,
    savedLists: 0,
    historyDays: 0,
  },

  // The real free tier. Has to be visibly better than Guest or signing in
  // buys nothing — hence 10 vs 3, and photo search switching on at all.
  // Still a hard cap: at meaningful traffic an uncapped free tier is
  // unbounded spend with no revenue against it, and there is no ad or
  // affiliate income to fall back on (Jumia's affiliate programme was found
  // dead/paused on 2026-08-28).
  free: {
    id: "free",
    name: "Free",
    priceNgnMonthly: 0,
    priceNgnYearly: null,
    requiresAccount: true,
    quotas: { text: 10, photo: 2 },
    priceWatches: 0,
    savedLists: 3,
    historyDays: 30,
  },

  // The main plan, ₦3,500/mo (raised from ₦2,000 on 2026-08-29).
  //
  // That sits at the premium end of Nigerian consumer subscriptions — above
  // Spotify and YouTube Premium, around Netflix's cheaper tiers — so it is
  // a bet that the value is legible. What has to carry it is priceWatches,
  // not the search allowance: a single alert catching an ₦80,000 drop pays
  // for two years. If watches don't land, this price won't either, and the
  // right response is to cut the price rather than pad the quotas.
  //
  // PRICED IN NAIRA, deliberately, even though the LLM costs behind it are
  // in dollars. A USD-pegged consumer price would visibly ratchet up every
  // time the naira moved, which reads as arbitrary and is the fastest way
  // to lose a subscriber who paid a different number last month; Paystack
  // charges Nigerian cards in naira anyway, and most buyers have no dollar
  // card. FX risk is absorbed the other way instead — by margin headroom
  // (see the ~25% cost-to-serve rule in scripts/analyze-costs.mts) and by
  // reviewing this number periodically, never by pegging it.
  plus: {
    id: "plus",
    name: "Velte Plus",
    priceNgnMonthly: 3500,
    // ~₦2,917/mo — two months free for prepaying, and far better cash flow.
    priceNgnYearly: 35000,
    requiresAccount: true,
    quotas: { text: 100, photo: 15 },
    priceWatches: 20,
    savedLists: -1,
    historyDays: -1,
  },

  // SMEs buying stock, not consumers. The only segment that reliably pays
  // for buying tools, and the one the existing BuyerRequest/RFQ machinery
  // already serves without new work.
  business: {
    id: "business",
    name: "Velte Business",
    priceNgnMonthly: 7500,
    // 10x the monthly rate — the same "two months free" the plans page
    // advertises for Plus. It was 78,000, which is only ~1.6 months free and
    // quietly made that badge a false claim on this tier.
    priceNgnYearly: 75000,
    requiresAccount: true,
    quotas: { text: 400, photo: 60 },
    priceWatches: 100,
    savedLists: -1,
    historyDays: -1,
  },
};

export const DEFAULT_PLAN: PlanId = "free";

// What a signed-in VENDOR is metered at (2026-08-29).
//
// Vendors sign in with their own cookie and are not Buyers, so they have no
// buyer plan to be on. Before this they fell through to `anonymous` — which
// meant a signed-in vendor was refused photo search and told to "sign in",
// while an actual stranger got unlimited text search. They are a known,
// paying account (leads + wallet top-ups), so they get a real allowance.
//
// Free's allowance rather than a bigger one, deliberately: a vendor
// researching competitors all day is exactly the traffic worth metering, and
// a vendor who needs more than this is describing a buyer use case they can
// take a buyer account out for. Point it at another tier here if that turns
// out to be wrong — nothing else needs to change.
export const VENDOR_PLAN: PlanId = "free";

// How many price watches a signed-in VENDOR gets (2026-08-29).
//
// Deliberately its own number rather than riding on VENDOR_PLAN, because the
// reasoning is different on each axis. SEARCH is metered for vendors to cap
// spend — a vendor researching all day is real cost. WATCHES are given to
// vendors on purpose: watching a competitor's price is a genuine reason for a
// vendor to keep an account open, it costs almost nothing to serve (a page
// fetch, no LLM), and vendors are the side that already pays.
//
// VENDOR_PLAN points at Free, which allows ZERO watches — so leaving these
// coupled would have silently denied vendors the feature while looking like a
// deliberate choice.
export const VENDOR_PRICE_WATCHES = 10;

/** The most expensive sellable tier — the one there is nothing above.
 *
 *  DERIVED, not written down: the upgrade CTA hides on exactly this plan, so
 *  hardcoding "business" would silently point at the wrong tier the moment a
 *  higher one is added, and keep offering an upgrade to whoever is already at
 *  the top. Free tiers are excluded — "highest" only means anything among
 *  plans you can actually buy. */
export const HIGHEST_PLAN_ID: PlanId = Object.values(PLANS)
  .filter((plan) => plan.priceNgnMonthly > 0)
  .sort((a, b) => b.priceNgnMonthly - a.priceNgnMonthly)[0].id;

/** Is this account already on the top tier?
 *
 *  Everything that ISN'T is upgradeable — guests, free buyers, vendors, and
 *  Plus subscribers alike. Per explicit request (2026-08-29): the CTA is
 *  hidden only at the very top, not for anyone who merely has an account or
 *  has already paid something. A Plus subscriber can still move to Business,
 *  and a guest should see there is something to move TO. */
export function isHighestPlan(planId: string | null | undefined): boolean {
  return planId === HIGHEST_PLAN_ID;
}

/** Resolves an arbitrary stored value to a real plan, never throwing. A
 *  buyer row with a null, missing or retired plan id must still be able to
 *  search — falling back to Free is the safe direction (it under-charges,
 *  never over-restricts). */
export function planFor(planId: string | null | undefined): Plan {
  if (planId && planId in PLANS) return PLANS[planId as PlanId];
  return PLANS[DEFAULT_PLAN];
}

/** The tier an unauthenticated browser is on. */
export function guestPlan(): Plan {
  return PLANS.anonymous;
}

/** Every ACCOUNT tier's quota for one kind, as `{ free: 10, plus: 100, … }`.
 *
 *  Sent to the backend on each consume so the whole decision is one round
 *  trip: the buyer's plan is stored on their row, but the numbers live here,
 *  and asking the backend for the plan and then telling it the limit would
 *  be two calls on a free tier that is slow enough already. The backend
 *  looks up its own buyer's plan in this table and enforces that row.
 *
 *  `anonymous` is excluded deliberately — a guest has no row to meter and
 *  never reaches the backend at all. */
export function accountQuotaTable(kind: MeteredKind): Record<string, number> {
  const table: Record<string, number> = {};
  for (const plan of Object.values(PLANS)) {
    if (!plan.requiresAccount) continue;
    table[plan.id] = plan.quotas[kind];
  }
  // Not a tier of its own — the row the backend uses when the account is a
  // vendor rather than a buyer. See VENDOR_PLAN.
  table.vendor = PLANS[VENDOR_PLAN].quotas[kind];
  return table;
}

/** Is this kind of search available on this plan at all, at any volume?
 *  Distinct from "has run out": a zero quota means the FEATURE is off (and
 *  the buyer should be told to sign in or upgrade), whereas a spent quota
 *  means come back next month. Those are different messages. */
export function isKindAvailable(plan: Plan, kind: MeteredKind): boolean {
  return plan.quotas[kind] > 0;
}
