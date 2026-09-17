import { NextResponse } from "next/server";

import { searchProductsCore } from "@/lib/server/ai/searchProductsTool";
import {
  fetchExternalOffers,
  hasExternalConnectors,
} from "@/lib/server/connectors";
import type { BuyerLocation } from "@/types/search";

// Shopping Lists (2026-09-12) — the one thin wrapper that lets
// velte-backend's own always-on sweep (jobs/shoppingListJob.job.js) reuse
// Velte's REAL product search without either side reimplementing it.
// Service-to-service only, gated on a shared secret DISTINCT from the one
// velte-backend already uses for its own call to staffly-ai-backend
// (matchingClient.service.js's INTERNAL_SERVICE_SECRET) — a leak on one
// internal channel must never compromise the other.
//
// Search order matches the spec exactly: Velte's own catalog first, then
// external only if Velte found nothing — never both, never external first.

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

export async function POST(req: Request) {
  const secret = req.headers.get("x-shopping-list-internal-secret");
  if (
    !process.env.SHOPPING_LIST_INTERNAL_SECRET ||
    secret !== process.env.SHOPPING_LIST_INTERNAL_SECRET
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
      return NextResponse.json({
        source: "velte",
        results: velte.results.slice(0, 6),
      });
    }

    if (!hasExternalConnectors()) {
      return NextResponse.json({ source: "none" });
    }
    const offers = await fetchExternalOffers({
      query: itemLabel,
      maxBudgetNaira: body?.maxBudgetNaira,
    });
    return NextResponse.json(
      offers.length ? { source: "external", offers } : { source: "none" },
    );
  } catch (err) {
    console.error("[shopping-list] search-item failed:", err);
    return NextResponse.json({ source: "none" });
  }
}
