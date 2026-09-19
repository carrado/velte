import { NextResponse } from "next/server";

import { searchProductsCore } from "@/lib/server/ai/searchProductsTool";
import {
  fetchExternalOffers,
  hasExternalConnectors,
} from "@/lib/server/connectors";
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

interface SearchItemBody {
  itemLabel?: string;
  location?: {
    lat?: number;
    lng?: number;
    area?: string | null;
    state?: string | null;
  } | null;
  maxBudgetNaira?: number;
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

  try {
    const velte = await searchProductsCore(
      { product: itemLabel, maxBudgetNaira: body?.maxBudgetNaira },
      { buyerLocation },
    );

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
      return NextResponse.json({ candidates });
    }

    if (!hasExternalConnectors()) {
      return NextResponse.json({ candidates: [] });
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
    return NextResponse.json({ candidates });
  } catch (err) {
    console.error("[shopping-plan] search-item failed:", err);
    return NextResponse.json({ candidates: [] });
  }
}
