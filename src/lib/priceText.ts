// Reading a price back out of a merchant's own price STRING.
//
// Lives here, client-safe, rather than inside recommendResults.ts (server
// only) because more than one place needs the same reading and they must
// never disagree about what a listing costs: the comparison call (ordering
// offers to find the cheapest) and route.ts's own budget filter both read
// through this.
//
// The strictness is the point. `ExternalOffer.priceText` is kept as the
// source's own string precisely because a mis-parsed price shown next to a
// real vendor's real price is the kind of confident wrongness this codebase
// avoids — so anything ambiguous yields null rather than a guess.

/**
 * A price string as a comparable number, or null when it isn't one.
 *
 * Deliberately strict: exactly one number in the string, or nothing. A range
 * ("₦40,000 - ₦60,000") or a "Call for price" yields null, because a
 * mis-ordered "Best price" badge is a false claim on a card.
 */
export function parseOfferPrice(priceText: string | null): number | null {
  if (!priceText) return null;
  const numbers = priceText.match(/\d[\d,]*(?:\.\d+)?/g);
  if (!numbers || numbers.length !== 1) return null;
  const value = Number(numbers[0].replace(/,/g, ""));
  return Number.isFinite(value) && value > 0 ? value : null;
}
