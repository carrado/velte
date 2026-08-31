import type { PriceBandChannelId } from "@/types/search";

// What each market is CALLED to a buyer (2026-08-31).
//
// Lifted out of PriceBand.tsx for the same dependency reason bandAllowance.ts
// exists: two things now need these words and they must never disagree. The
// band block renders them; the negotiation brief writes them into sentences
// server-side ("shops near you are asking ₦95,000–₦120,000"). A second copy
// in either place is a table that drifts, and the drift would be invisible —
// both halves would still render, just calling the same market two things in
// two blocks of the same reply.
//
// Client-safe on purpose, so the direction of the dependency stays sane: a
// client component can import this, where it could never import the
// server-only band builder.

/** Never "channel", never "informal" — those are our words for the split, not
 *  the buyer's. A buyer recognises "shops near you" and "Jumia, Konga";
 *  nobody recognises a taxonomy. */
export const CHANNEL_LABEL: Record<PriceBandChannelId, string> = {
  local: "Shops near you",
  informal: "Jiji & small sellers",
  formal: "Online stores",
};

/** The same names mid-sentence, where "Shops near you are asking…" needs to
 *  read as English rather than as a pasted-in row heading.
 *
 *  A separate map rather than a `.toLowerCase()` of the one above, because
 *  lowercasing is wrong for two of the three: "jiji & small sellers" and
 *  "jumia, konga" are proper nouns and look like typos in lower case. */
export const CHANNEL_PHRASE: Record<PriceBandChannelId, string> = {
  local: "shops near you",
  informal: "sellers on Jiji and similar",
  formal: "the online stores",
};
