import { serperConnector } from "@/lib/server/connectors/serper";
import type { ExternalConnector } from "@/lib/server/connectors/types";
import type { ExternalOffer } from "@/types/search";

export type { ExternalConnector } from "@/lib/server/connectors/types";

// Phase 4's orchestrator — the one place that decides WHETHER external
// sources run and merges what they return. Connectors themselves stay
// dumb (see types.ts), so adding Konga or a Jumia affiliate feed later is
// a new file plus one line in this array.
const CONNECTORS: ExternalConnector[] = [serperConnector];

// Ceiling on what a dead end shows. This is a consolation list, not a
// catalogue — a wall of thirty off-Velte links buries the "here's what to
// do next" message and reads like giving up.
const MAX_OFFERS = 6;

/** True when at least one connector is configured — lets callers skip the
 *  status line and the whole code path on an install with no keys. */
export function hasExternalConnectors(): boolean {
  return CONNECTORS.some((c) => c.isEnabled());
}

// Near-duplicate detection across sources. Same product listed by two
// merchants (or the same merchant twice with different tracking URLs) is
// one offer to a buyer. Deliberately crude — lowercase, strip punctuation,
// collapse whitespace, take the first several words — because the cost of
// wrongly merging two similar listings is far lower here than the cost of
// showing the buyer the same phone five times.
function titleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 6)
    .join(" ");
}

/**
 * Runs every configured connector for `query` and returns a merged,
 * deduplicated, capped list. Never throws and never rejects: a failing
 * source contributes an empty list, and all sources failing is simply an
 * empty result — indistinguishable, to the buyer, from Velte having had no
 * fallback to offer, which is exactly the pre-Phase-4 behaviour.
 *
 * IMPORTANT: this does not decide when it is appropriate to show external
 * results — the caller does. Velte's own vendors always come first, and
 * these only ever appear when Velte itself had nothing. That ordering is
 * the product, not a detail: the business is the vendor handoff, and this
 * is the consolation that keeps a dead end from being a dead stop.
 */
export async function fetchExternalOffers(params: {
  query: string;
  country?: string;
  limit?: number;
}): Promise<ExternalOffer[]> {
  const enabled = CONNECTORS.filter((c) => c.isEnabled());
  if (!enabled.length || !params.query.trim()) return [];

  const settled = await Promise.allSettled(
    enabled.map((c) =>
      c.search({
        query: params.query,
        country: params.country,
        limit: params.limit ?? MAX_OFFERS,
      }),
    ),
  );

  const seen = new Set<string>();
  const merged: ExternalOffer[] = [];
  for (const result of settled) {
    // A connector that threw despite the contract still can't take the
    // turn down — allSettled plus this guard is the belt to that braces.
    if (result.status !== "fulfilled") {
      console.error("[connectors] a connector rejected:", result.reason);
      continue;
    }
    for (const offer of result.value) {
      const key = titleKey(offer.title);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(offer);
      if (merged.length >= (params.limit ?? MAX_OFFERS)) return merged;
    }
  }
  return merged;
}
