import { NextResponse } from "next/server";

import { searchProductsCore } from "@/lib/server/ai/searchProductsTool";
import { aiSearchData } from "@/lib/server/aiSearchBackend";
import {
  fetchExternalOffers,
  hasExternalConnectors,
} from "@/lib/server/connectors";
import { USER_AGENT } from "@/lib/server/connectors/pageMeta";
import { parseOfferPrice } from "@/lib/priceText";
import type { BuyerLocation } from "@/types/search";

// Shopping Plan (2026-09-18) — the one thin wrapper that lets
// velte-backend's own always-on monitoring sweep (jobs/shoppingPlan.job.js)
// reuse Velte's REAL product search without either side reimplementing it.
// Service-to-service only, gated on a shared secret DISTINCT from the one
// velte-backend already uses for its own call to staffly-ai-backend — a
// leak on one internal channel must never compromise the other. Same
// pattern the deleted Shopping List feature's own internal route already
// proved out.
//
// Search order matches the rest of the app: Velte's own catalog first,
// external only if Velte found nothing.
//
// Returns a NORMALIZED candidate list (candidateKey/source/priceNaira/
// available/snapshot) rather than raw VendorMatch/ExternalOffer arrays —
// velte-backend needs to diff a price/availability history against its own
// stored candidates, and doing that from two structurally different shapes
// (VendorMatch.price is a number; ExternalOffer.priceText is a raw string,
// deliberately never parsed to a number in its own type — see that type's
// own comment) belongs on this side, which already knows how to read both,
// not duplicated on the backend, which is meant to stay opaque to them.
//
// Also returns two "is this old one still real" verdicts alongside the
// fresh candidates (stillAvailableVelteProductIds, goneExternalUrls) — see
// verifyStillAvailable/verifyGoneExternalUrls' own comments. Both exist for
// the same reason: shoppingPlan.job.js's diffItemCandidates must never read
// "didn't rank in this cycle's capped, re-ranked search" as "gone" on its
// own — a still-real listing that merely fell out of the top-N looked
// identical to a genuinely unavailable one until these shipped.

interface SearchItemBody {
  itemLabel?: string;
  location?: {
    lat?: number;
    lng?: number;
    area?: string | null;
    state?: string | null;
  } | null;
  maxBudgetNaira?: number;
  // The caller's OWN already-known velte_product candidates for this item
  // (2026-09-19, "old ones shouldn't go provided they're still available"
  // fix) — checked directly against the product collection below rather
  // than inferred from whether they happen to reappear in this cycle's
  // capped, re-ranked search below. Optional: absent/empty on a fresh item
  // with nothing known yet.
  knownVelteProductIds?: string[];
  // The caller's own already-known EXTERNAL candidate urls for this item
  // (2026-09-21, same "old ones shouldn't go without real proof" fix as
  // knownVelteProductIds above, applied to the source that fix couldn't
  // reach — see verifyGoneExternalUrls' own comment for why external
  // needs a differently-shaped check). Optional, same reasoning.
  knownExternalUrls?: string[];
}

interface NormalizedCandidate {
  candidateKey: string;
  source: "velte_product" | "external";
  priceNaira: number | null;
  available: boolean;
  snapshot: unknown;
}

// Generous relative to the old Shopping List route's `.slice(0, 6)` —
// shoppingPlan.job.js's own diffing treats a candidate that drops out of
// this list as "gone", so a tighter cap would read ordinary ranking churn
// as items becoming unavailable more often than is true.
const MAX_VELTE_CANDIDATES = 15;
const MAX_EXTERNAL_CANDIDATES = 10;

/**
 * Direct existence/suspension check against staffly-ai-backend's own
 * Product collection (2026-09-19) — see search.controller.js's
 * `verifyProducts` for the full reasoning. Never throws.
 *
 * Returns `null` on any failure — deliberately distinct from `[]`. An empty
 * array is a real, actionable answer ("none of these are still available"),
 * while `null` means the check itself didn't run at all: shoppingPlan.job.js
 * must treat `null` as "couldn't confirm either way" and leave those
 * candidates exactly as they were, never read a failed side-query as proof
 * every known candidate just vanished.
 */
async function verifyStillAvailable(
  productIds: string[],
): Promise<string[] | null> {
  if (!productIds.length) return [];
  try {
    const { available } = await aiSearchData<{ available: string[] }>(
      "/search/products/verify",
      { method: "POST", body: { productIds } },
    );
    return Array.isArray(available) ? available : [];
  } catch (err) {
    console.error("[shopping-plan] product verify failed:", err);
    return null;
  }
}

// Bounded the same way pageMeta.ts's own batch fetch is — this hits the
// exact same third-party storefronts, so the same "politer and faster than
// getting throttled" lesson applies.
const EXTERNAL_CHECK_TIMEOUT_MS = 5000;
const EXTERNAL_CHECK_CONCURRENCY = 4;

/**
 * Which of these previously-known EXTERNAL listing urls are CONFIRMED gone
 * (2026-09-21 fix — found live: a buyer's category lost items between
 * monitoring cycles that were never actually out of stock, just absent from
 * that cycle's re-ranked top-N Google Shopping/organic results — the exact
 * false-negative the 2026-09-19 fix already solved for Velte's own products,
 * left open here because "no equivalent direct check exists" for a source
 * this app doesn't control — see diffItemCandidates' own comment on that
 * gap).
 *
 * Deliberately the INVERSE shape of verifyStillAvailable above: an arbitrary
 * third-party fetch is far flakier than a database query — timeouts,
 * bot-blocking, rate limits, exactly the obstacles pageMeta.ts already
 * works around for these same storefronts — so this only ever reports a url
 * as gone on an UNAMBIGUOUS 404/410. Every other outcome (a timeout, a
 * block, a 5xx, a plain fetch failure, or an ordinary 200 — which proves
 * the PAGE still exists, not whether the item is still in stock on it) is
 * silently "can't tell", never "gone". Never throws, and a url this
 * couldn't check at all is simply absent from the result — indistinguishable
 * from one confirmed still live, which is the safe direction for an
 * inherently unreliable check to fail in.
 */
async function verifyGoneExternalUrls(urls: string[]): Promise<string[]> {
  if (!urls.length) return [];
  const gone: string[] = [];
  let next = 0;
  const worker = async () => {
    for (;;) {
      const index = next++;
      if (index >= urls.length) return;
      const url = urls[index];
      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        EXTERNAL_CHECK_TIMEOUT_MS,
      );
      try {
        let res = await fetch(url, {
          method: "HEAD",
          redirect: "follow",
          signal: controller.signal,
          headers: { "User-Agent": USER_AGENT },
        });
        // A handful of storefronts reject HEAD outright — fall back to a
        // GET, cancelling the body immediately since only the status
        // matters here (same restraint pageMeta.ts's own MAX_BYTES cap is
        // built on: don't pay for more of the page than the job needs).
        if (res.status === 405) {
          res = await fetch(url, {
            method: "GET",
            redirect: "follow",
            signal: controller.signal,
            headers: { "User-Agent": USER_AGENT },
          });
          await res.body?.cancel().catch(() => {});
        }
        if (res.status === 404 || res.status === 410) gone.push(url);
      } catch {
        // Timeout, DNS, TLS, a network blip — all "can't tell", never
        // "gone". Nothing to log: an unreachable listing is the expected,
        // routine case here, not an error worth noise over.
      } finally {
        clearTimeout(timer);
      }
    }
  };
  await Promise.all(
    Array.from(
      { length: Math.min(EXTERNAL_CHECK_CONCURRENCY, urls.length) },
      worker,
    ),
  );
  return gone;
}

export async function POST(req: Request) {
  const secret = req.headers.get("x-shopping-plan-internal-secret");
  if (
    !process.env.SHOPPING_PLAN_INTERNAL_SECRET ||
    secret !== process.env.SHOPPING_PLAN_INTERNAL_SECRET
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as SearchItemBody | null;
  const itemLabel = body?.itemLabel?.trim();
  if (!itemLabel) {
    return NextResponse.json(
      { error: "itemLabel is required." },
      { status: 400 },
    );
  }

  const buyerLocation: BuyerLocation | undefined =
    body?.location?.lat != null && body?.location?.lng != null
      ? { lat: body.location.lat, lng: body.location.lng }
      : undefined;

  // The direct re-check (2026-09-19) — run alongside the ranked search
  // below, not derived from it. Answers "is this specific, already-known
  // product still real and un-suspended" regardless of whether THIS cycle's
  // capped top-N search happens to return it again; see verifyStillAvailable
  // below and search.controller.js's own comment on why presence in a
  // ranked, capped list was never a reliable enough signal for "it's gone".
  const knownVelteProductIds = Array.isArray(body?.knownVelteProductIds)
    ? body.knownVelteProductIds.filter(
        (id): id is string => typeof id === "string" && id.length > 0,
      )
    : [];
  // The external-source counterpart (2026-09-21) — see verifyGoneExternalUrls'
  // own comment.
  const knownExternalUrls = Array.isArray(body?.knownExternalUrls)
    ? body.knownExternalUrls.filter(
        (url): url is string => typeof url === "string" && url.length > 0,
      )
    : [];

  try {
    const [velte, stillAvailableVelteProductIds, goneExternalUrls] =
      await Promise.all([
        searchProductsCore(
          { product: itemLabel, maxBudgetNaira: body?.maxBudgetNaira },
          { buyerLocation },
        ),
        verifyStillAvailable(knownVelteProductIds),
        verifyGoneExternalUrls(knownExternalUrls),
      ]);

    if (!("error" in velte) && velte.results.length) {
      const candidates: NormalizedCandidate[] = velte.results
        .slice(0, MAX_VELTE_CANDIDATES)
        .map((match) => ({
          candidateKey: `velte_product:${match.productId}`,
          source: "velte_product",
          // A quote-on-request service has no real price to track — never
          // 0, which would read as a genuine price drop to ₦0 later.
          priceNaira: match.quoteOnRequest ? null : match.price,
          // Already filtered to available/non-suspended listings by the
          // search itself — a candidate that stops being returned at all
          // is what signals "unavailable now" (see shoppingPlan.job.js's
          // own comment on why absence, not a flag, carries that meaning).
          available: true,
          snapshot: match,
        }));
      return NextResponse.json({
        candidates,
        stillAvailableVelteProductIds,
        goneExternalUrls,
      });
    }

    if (!hasExternalConnectors()) {
      return NextResponse.json({
        candidates: [],
        stillAvailableVelteProductIds,
        goneExternalUrls,
      });
    }
    const offers = await fetchExternalOffers({
      query: itemLabel,
      maxBudgetNaira: body?.maxBudgetNaira,
    });
    const candidates: NormalizedCandidate[] = offers
      .slice(0, MAX_EXTERNAL_CANDIDATES)
      .map((offer) => ({
        candidateKey: `external:${offer.id}`,
        source: "external",
        priceNaira: parseOfferPrice(offer.priceText),
        available: true,
        snapshot: offer,
      }));
    return NextResponse.json({
      candidates,
      stillAvailableVelteProductIds,
      goneExternalUrls,
    });
  } catch (err) {
    console.error("[shopping-plan] search-item failed:", err);
    return NextResponse.json({ candidates: [] });
  }
}
