// Deterministic cart/checkout intent — never left to the model.
//
// Found live: "Add the exact match to cart" and "Go to checkout" both
// made the model call searchProducts (and then invent Pay / promo-code
// copy). Same class of gap as the buyer-request "yes" short-circuit:
// do not trust the model to pick addToCart over a search, or to leave
// checkout alone. This parser is deliberately NARROW so a real search
// ("check out these sneakers", "add a charger to my order later") still
// reaches the ordinary pipeline.

const WORD_QTY: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

const WORD_ORDINAL: Record<string, number> = {
  first: 1,
  "1st": 1,
  second: 2,
  "2nd": 2,
  third: 3,
  "3rd": 3,
  fourth: 4,
  "4th": 4,
  fifth: 5,
  "5th": 5,
  last: -1,
};

export type CartIntent =
  | {
      kind: "add";
      ordinal?: number;
      nameHint?: string;
      quantity: number;
    }
  | { kind: "checkout" };

function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/g, "")
    .replace(/\s+/g, " ");
}

function isCheckout(t: string): boolean {
  // "check out these shoes" is a SEARCH. Only the compound "checkout"
  // (or "go to / proceed to checkout") counts as the cart action.
  if (
    /^(please )?(go to |proceed to |open )?(the |my )?checkout$/.test(t) ||
    /^(please )?(go to |proceed to |open )(my |the )?cart$/.test(t) ||
    /^(please )?open (my )?cart$/.test(t) ||
    t === "pay" ||
    t === "pay now" ||
    t === "review cart"
  ) {
    return true;
  }
  if (t.length > 80) return false;
  return (
    /\b(go to|proceed to|take me to)\s+(the\s+)?checkout\b/.test(t) ||
    /\bopen (my |the )?cart\b/.test(t)
  );
}

function parseQuantity(t: string): number {
  const digit = t.match(/\b(?:add|put)\s+(\d{1,2})\b|\b(\d{1,2})\s+(?:of|x)\b/);
  const n = Number(digit?.[1] || digit?.[2] || "");
  if (Number.isInteger(n) && n >= 1 && n <= 10) return n;
  const word = t.match(
    /\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/,
  );
  if (word?.[1] && WORD_QTY[word[1]]) return WORD_QTY[word[1]];
  return 1;
}

function parseAddDetails(t: string): Extract<CartIntent, { kind: "add" }> {
  const quantity = parseQuantity(t);
  const ordinalWord = t.match(
    /\b(?:the\s+)?(first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|last)\b/,
  );
  if (ordinalWord?.[1] && WORD_ORDINAL[ordinalWord[1]] != null) {
    return { kind: "add", ordinal: WORD_ORDINAL[ordinalWord[1]], quantity };
  }

  if (/\bexact(\s+match|\s+one)?\b/.test(t)) {
    return { kind: "add", nameHint: "exact match", quantity };
  }

  const named = t.match(
    /\b(?:the|this|that)\s+([a-z0-9][a-z0-9 \-]{1,40}?)(?:\s+one)?(?:\s+to(?:\s+my)?\s+cart)?$/,
  );
  if (named?.[1]) {
    const hint = named[1].replace(/\s+to(?:\s+my)?\s+cart$/, "").trim();
    if (
      hint &&
      !/^(it|this|that|them|one|item|listing|product|cart)$/.test(hint)
    ) {
      return { kind: "add", nameHint: hint, quantity };
    }
  }

  return { kind: "add", quantity };
}

function isAddToCart(t: string): boolean {
  const hasCart = /\bcart\b/.test(t);
  const addVerb = /\b(add|put|throw)\b/.test(t);
  if (hasCart && addVerb) return true;
  if (t.length > 70) return false;
  // Short "add the exact match" / "add the first one" / "add this one"
  // without needing the word "cart" — these only fire when the object is
  // a demonstrative, an ordinal, or "exact match", never "add a charger".
  if (!/^(please )?add\b/.test(t)) return false;
  return /\b(exact match|exact one|first|second|third|last|this one|that one|it|them|the \w+ one)\b/.test(
    t,
  );
}

export function parseCartIntent(text: string): CartIntent | null {
  const t = normalize(text);
  if (!t) return null;
  if (isCheckout(t)) return { kind: "checkout" };
  if (isAddToCart(t)) return parseAddDetails(t);
  return null;
}

export function replyForCartAdd(
  outcome: import("@/types/cart").CartAddOutcome,
): string {
  switch (outcome.status) {
    case "ok":
      return "Added to your cart.";
    case "needs_signin":
      return "Sign in to add this to your cart.";
    case "needs_options": {
      const names = outcome.missing.map((g) => g.name.toLowerCase());
      const which =
        names.length === 1 ? names[0] : names.slice(0, 2).join(" and ");
      return `Which ${which} for the ${outcome.name}?`;
    }
    case "vendor_mismatch":
      return `Your cart is at ${outcome.currentVendorName}. Empty it to add this.`;
    case "ineligible":
    case "not_shown":
    case "external":
      return outcome.reason;
    default:
      return "Couldn't add that just now.";
  }
}
