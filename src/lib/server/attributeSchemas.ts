import { aiSearchData } from "@/lib/server/aiSearchBackend";
import type {
  AttributePreset,
  AttributeSchemaOverrides,
  CategorySchemaRow,
} from "@/types/product";

// Phase 2 (docs/velte-ai-search-flow-plan.md): fetches the DB-backed
// clarifying-question schema overrides from staffly-ai-backend and folds
// them into the lookup shape sectorClarifiers.ts consumes. Everything here
// is built to be INVISIBLE when it can't help: the collection starting
// empty, the fetch failing, or the backend being down all resolve to the
// in-code presets behaving exactly as they always have — a schema override
// is a tuning knob, never a dependency.
//
// Cached in module memory with a short TTL rather than fetched per turn —
// "editable without a deploy, fresh within minutes" is the contract, and a
// search turn must never spend meaningful latency on this. On a serverless
// deploy the cache only survives warm invocations, which just means a cold
// start pays the one small fetch.

const CACHE_TTL_MS = 5 * 60 * 1000;

// Hard cap on how long a turn will ever wait on this fetch — beyond it the
// turn proceeds on in-code presets and the fetch keeps running to warm the
// cache for the next one.
const FETCH_TIMEOUT_MS = 1500;

export const EMPTY_ATTRIBUTE_OVERRIDES: AttributeSchemaOverrides = {
  serviceGroups: new Map(),
  productCategories: new Map(),
  productGeneral: null,
};

let cache: { at: number; overrides: AttributeSchemaOverrides } | null = null;
let inflight: Promise<AttributeSchemaOverrides> | null = null;

function isValidItem(item: unknown): item is AttributePreset {
  return (
    typeof item === "object" &&
    item !== null &&
    typeof (item as AttributePreset).name === "string" &&
    (item as AttributePreset).name.trim().length > 0
  );
}

function fold(rows: CategorySchemaRow[]): AttributeSchemaOverrides {
  const overrides: AttributeSchemaOverrides = {
    serviceGroups: new Map(),
    productCategories: new Map(),
    productGeneral: null,
  };
  for (const row of rows) {
    if (!row || typeof row.key !== "string" || !Array.isArray(row.items)) {
      continue;
    }
    const items = row.items.filter(isValidItem);
    // An empty override would silently strip a whole group's questions —
    // the backend already rejects empty writes, but never trust that from
    // here (a manual Mongo edit can bypass it).
    if (items.length === 0) continue;
    if (row.kind === "service_group") {
      overrides.serviceGroups.set(row.key, items);
    } else if (row.kind === "product_category") {
      overrides.productCategories.set(row.key, items);
    } else if (row.kind === "product_general") {
      overrides.productGeneral = items;
    }
  }
  return overrides;
}

async function fetchOverrides(): Promise<AttributeSchemaOverrides> {
  const { schemas } = await aiSearchData<{ schemas: CategorySchemaRow[] }>(
    "/search/category-schemas",
  );
  const overrides = fold(schemas ?? []);
  cache = { at: Date.now(), overrides };
  return overrides;
}

/**
 * The overrides as of the last few minutes — never throws, never blocks a
 * turn longer than FETCH_TIMEOUT_MS. Stale-cache beats empty beats waiting.
 */
export async function getAttributeSchemaOverrides(): Promise<AttributeSchemaOverrides> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.overrides;

  if (!inflight) {
    inflight = fetchOverrides().finally(() => {
      inflight = null;
    });
    // A rejection may surface after the caller below has already timed out
    // and moved on — swallow it there so it never becomes an unhandled
    // rejection (the catch below only covers callers still awaiting).
    inflight.catch(() => {});
  }

  try {
    return await Promise.race([
      inflight,
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("attribute-schema fetch timed out")),
          FETCH_TIMEOUT_MS,
        ),
      ),
    ]);
  } catch (err) {
    console.error(
      "[search] attribute-schema overrides unavailable, using in-code presets:",
      err instanceof Error ? err.message : err,
    );
    // A stale cache is still a better tuning snapshot than none at all.
    return cache?.overrides ?? EMPTY_ATTRIBUTE_OVERRIDES;
  }
}
