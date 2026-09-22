import type { ExternalOffer } from "@/types/search";

// Phase 4 (docs/velte-ai-search-flow-plan.md) — the external-source layer.
//
// The contract every connector conforms to, so the orchestrator never knows
// or cares which source it's talking to. Deliberately narrow: a connector's
// ONLY job is "given a query, return normalized offers or nothing". It does
// not rank, does not dedupe, does not decide whether it should have run —
// that all belongs to the orchestrator, so adding a second source later is
// a new file rather than a change to the search flow.
//
// Three rules every implementation must hold to:
//   1. NEVER THROW. A dead external source must be invisible to the buyer,
//      not an error on a turn that already has real content to show.
//   2. NO-OP WHEN UNCONFIGURED. `isEnabled` returns false when the API key
//      is unset, and the orchestrator skips it — so a fresh clone with no
//      keys behaves exactly like today's Velte-only search.
//   3. NEVER FABRICATE. Every field comes from the upstream response or is
//      left null. An offer with no price is honest; an invented one is the
//      whole thing this codebase exists to avoid.
export interface ExternalConnector {
  /** Stable id used in logs and as the offer's `source`. */
  name: string;
  /** False when the connector has no API key configured. */
  isEnabled(): boolean;
  /** Normalized offers, newest search each time. Never throws. */
  search(params: {
    query: string;
    /** ISO country for regional results — "ng" in practice. */
    country?: string;
    /** The place name the buyer's own words named, if any (e.g. "Anambra",
     *  "Enugu") — never a raw lat/lng, only a NAME to fold into the query
     *  text the same way instagramBusinessSearch.ts already does for its
     *  own connector (2026-09-22, found live: a buyer who named "Anambra"
     *  directly got back land listings in Ibadan, Ikorodu and Abuja — this
     *  field never existed on the connector contract at all, so a buyer's
     *  stated location was extracted for Velte's own search but silently
     *  dropped before it ever reached an external one). Omitted when the
     *  buyer named no place — a connector must NEVER guess one; a
     *  nationwide result is the honest answer to a location-free query,
     *  same as Velte's own search already treats it. */
    location?: string | null;
    limit?: number;
  }): Promise<ExternalOffer[]>;
}
