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
    limit?: number;
  }): Promise<ExternalOffer[]>;
}
