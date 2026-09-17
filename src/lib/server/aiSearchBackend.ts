/* Sibling of backend.ts, pointed at the standalone staffly-ai-backend service
   instead of velte-backend. Search was split into its own backend so the
   buyer-facing search hot path doesn't share traffic/deploys with the vendor
   dashboard API — see staffly-ai-backend's README. Only the search tools
   (searchProductsTool, searchStoresTool) and the recruitment-lead log call in
   /api/search/route.ts use this; everything else (store lookups, lead
   billing, auth, products, wallet, ...) still goes through backend.ts to
   velte-backend unchanged. Same request/response contract (both backends
   return the same { success, data } / { success, message } envelope), so
   this is a straight copy of backend.ts's shape with a different base URL —
   not worth a shared/parameterized abstraction for two small files. */

const AI_SEARCH_API_BASE =
  process.env.AI_SEARCH_API_URL || "http://localhost:7100/api";

// Found live (2026-09-15): a "formal watch" turn sat on its FIRST status
// phrase forever — not slow, not errored, genuinely stuck with no way out.
// Root cause: this file's own `fetch` call had no timeout at all, ever,
// since it was written. Every search tool (searchProducts, searchStores,
// the dead-end cascade's own cross-checks, the "similar store match"
// branch's eligibility check — every single caller of aiSearchData/
// aiSearchFetch in the whole app) sits directly on top of this one
// function, so ANY stall here — the sibling staffly-ai-backend service
// wedged, a dropped connection, a network partition — hung the ENTIRE
// buyer-facing turn indefinitely, with nothing to catch it: every
// existing try/catch around a search call (hasContactableVendorsForQuery,
// the cascade fallbacks, my own new eligibility check) was already written
// correctly to fail safe on a THROWN error, but a promise that never
// settles never reaches any of them.
//
// staffly-ai-backend's own retrieval.service.js bounds its internal work
// to SEARCH_DEADLINE_MS (22s) — this is comfortably above that on purpose,
// a genuine "something is actually stuck" safety net, never a race against
// legitimately-still-working search.
const TIMEOUT_MS = 30_000;

export class AiSearchBackendError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "AiSearchBackendError";
  }
}

interface AiSearchBackendOptions {
  method?: string;
  body?: unknown;
}

function messageFrom(data: unknown, status: number): string {
  return (
    (data as { message?: string; error?: string } | null)?.message ??
    (data as { error?: string } | null)?.error ??
    `Upstream request failed (${status}).`
  );
}

async function doFetch(
  path: string,
  { method = "GET", body }: AiSearchBackendOptions,
): Promise<{ res: Response; data: unknown }> {
  const res = await fetch(`${AI_SEARCH_API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* upstream returned no/invalid JSON */
  }
  return { res, data };
}

/** Call the AI search backend, returning the parsed body. Throws on non-2xx. */
export async function aiSearchFetch<T = unknown>(
  path: string,
  opts: AiSearchBackendOptions = {},
): Promise<T> {
  const { res, data } = await doFetch(path, opts);
  if (!res.ok)
    throw new AiSearchBackendError(res.status, messageFrom(data, res.status));
  return data as T;
}

/** aiSearchFetch + unwrap the `{ data }` envelope the backend uses for most calls. */
export async function aiSearchData<T = unknown>(
  path: string,
  opts: AiSearchBackendOptions = {},
): Promise<T> {
  const body = await aiSearchFetch<{ data: T }>(path, opts);
  return body.data;
}
