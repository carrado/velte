// When is a search turn actually billable? (2026-09-03)
//
// ── Why this is its own file ────────────────────────────────────────────
//
// The rule has to run in TWO places that cannot share a runtime: the server
// charges signed-in buyers and vendors (/api/search's sendFinal), and the
// browser charges guests, because a guest has no row on the server to charge
// — their balance lives in their own localStorage.
//
// Those were two hand-written copies of the same condition, one of them
// carrying a comment promising it "mirrors the server's rule exactly". That
// promise held for as long as nobody changed one of them. When the
// clarification exemption below was added to the server, the copy in
// searchStream.ts silently kept charging — for the one population the
// exemption exists to protect, since a guest has five credits and an intake
// can ask four questions.
//
// So the rule lives here, once, imported by both. Client-safe, for the same
// reason credits.ts is: there is nothing secret in it, and the alternative is
// a second copy that drifts.

/** Just the fields the rule reads. Structural rather than the full
 *  `SearchStreamEvent` variant, because the server passes an `Omit<…>` of it
 *  and the client passes the whole thing — and neither should have to care. */
export interface BillableTurnShape {
  clarification: unknown | null;
  products: unknown[];
  weakProducts: unknown[];
  stores: unknown[];
  furtherStores: unknown[];
  productStores: unknown[];
  vendorProducts: unknown[];
  externalOffers: unknown[];
  externalStoreSuggestions: unknown[];
}

/**
 * True when this turn delivered something the buyer should pay for.
 *
 * Two exemptions, and both are the same principle — charge for answers, not
 * for work:
 *
 * 1. ANSWERED FROM NEARBY BUSINESSES. `externalStoreSuggestions` with no
 *    `externalOffers` is exactly the path that skips the external price
 *    lookup, so no Serper call was made and there is nothing to have paid
 *    for.
 *
 * 2. ASKED A QUESTION AND SHOWED NOTHING. A turn whose entire output is
 *    "which one did you mean?" is not an answer. Under per-turn billing an
 *    intake that asks four questions costs 5 credits before a single result
 *    — and a guest has exactly 5, so the buyer who does not know precisely
 *    what they want spends everything being interviewed and sees nothing,
 *    while someone who types an exact model number pays 1. That is backwards:
 *    it charges most for the conversations where Velte is worth most.
 *
 *    The cost of this is real and accepted: a clarifying turn still makes a
 *    model call, so an intake is several calls billed as one. It is bounded —
 *    the buyer cannot force clarifications, the model decides — and the turn
 *    that finally answers is charged normally.
 *
 * A turn that errored never reaches either call site, so failure needs no
 * case here.
 */
export function isBillableTurn(event: BillableTurnShape): boolean {
  const answeredFromPlaces =
    event.externalStoreSuggestions.length > 0 &&
    event.externalOffers.length === 0;
  if (answeredFromPlaces) return false;

  const showedNothing =
    event.products.length === 0 &&
    event.weakProducts.length === 0 &&
    event.stores.length === 0 &&
    event.furtherStores.length === 0 &&
    event.productStores.length === 0 &&
    event.vendorProducts.length === 0 &&
    event.externalOffers.length === 0 &&
    event.externalStoreSuggestions.length === 0;

  if (event.clarification != null && showedNothing) return false;

  return true;
}
