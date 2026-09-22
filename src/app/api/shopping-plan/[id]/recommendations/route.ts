import { NextResponse } from "next/server";

import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { getOptionalVendorAuth, jsonError } from "@/lib/server/guards";
import { backendData, BackendError } from "@/lib/server/backend";
import {
  pickExternalRecommendation,
  pickRecommendation,
} from "@/lib/server/ai/recommendResults";
import { latestAvailable } from "@/lib/shoppingPlanCandidates";
import type { ShoppingPlan, ShoppingPlanCandidate } from "@/types/shoppingPlan";
import type {
  ExternalOffer,
  SearchRecommendation,
  VendorMatch,
} from "@/types/search";

// GET /api/shopping-plan/:id/recommendations — the "Top pick" layer for a
// Shopping Plan's own detail page (2026-09-21), reusing the EXACT same
// comparison call regular chat search already runs (recommendResults.ts)
// rather than inventing a second scoring system. Kept as its OWN route,
// separate from GET /api/shopping-plan/:id, on purpose:
//
//   - The plan's own data (prices, statuses, candidates) is cheap and
//     already fresh every monitoring cycle; a recommendation is an extra
//     LLM call per item and shouldn't block or slow down loading the plan
//     itself. The detail page fetches both in parallel and renders the
//     plan immediately, filling in "Recommended" once this resolves.
//   - It's computed ON VIEW, not during the background sweep
//     (shoppingPlan.job.js) — a plan nobody is looking at right now costs
//     nothing extra. That job already runs unconditionally regardless of
//     the owner's balance (see its own 2026-09-21 UNBILLED-check flag); a
//     second LLM call added to every background cycle would only make that
//     worse. This route is the buyer's own page load, gated the same way
//     every other buyer-facing request already is.
//   - No backend/model changes: nothing here is persisted. A refresh
//     recomputes rather than reads a stored verdict — acceptable because
//     recommendResults.ts's own call is already designed to be cheap enough
//     to run per-turn in ordinary chat search, and a Shopping Plan detail
//     page is opened far less often than a chat turn is sent.
//
// Reuses pickRecommendation/pickExternalRecommendation UNCHANGED — same
// prompt, same sanitizing, same "never invent, never throw" contract. The
// only adaptation is IDENTITY: those functions key everything off
// VendorMatch.productId / ExternalOffer.id, but a Shopping Plan candidate's
// real, stable identifier is its own Mongo-assigned `id` (see
// shoppingPlan.controller.js's toClientShape — `candidateKey` is an
// internal diffing key, never sent to the client as `id`). Reconstructing
// each candidate's snapshot with THAT id substituted in is what lets a
// verdict's bestOverallId/bestValueId/tradeoff.productId resolve straight
// back to a ShoppingPlanCandidate.id on the frontend, with no translation
// table needed on either side.

/** Loosely rebuilds a VendorMatch from a persisted candidate's own
 *  snapshot — the same defensive, optional-field-by-field read
 *  ShoppingPlanDetailPage.tsx's own candidateDetail() already does, because
 *  this is the same untyped `unknown` blob (see ShoppingPlanCandidate's own
 *  comment). `productId` is overridden to the candidate's OWN id rather than
 *  whatever the snapshot originally carried — see this file's header. */
function reconstructVendorMatch(
  candidate: ShoppingPlanCandidate,
): VendorMatch | null {
  const s = candidate.snapshot as Record<string, unknown> | null;
  if (!s || typeof s !== "object") return null;
  return {
    productId: candidate.id,
    kind: s.kind === "service" ? "service" : "product",
    name: (s.name as string | undefined) || "Option",
    price: typeof s.price === "number" ? s.price : 0,
    priceMax: typeof s.priceMax === "number" ? s.priceMax : null,
    quoteOnRequest: Boolean(s.quoteOnRequest),
    currency: (s.currency as string | undefined) || "NGN",
    mainImageUrl: (s.mainImageUrl as string | null | undefined) ?? null,
    thumbnailUrls: Array.isArray(s.thumbnailUrls)
      ? (s.thumbnailUrls as string[])
      : [],
    storeHandle: (s.storeHandle as string | null | undefined) ?? null,
    description: (s.description as string | null | undefined) ?? null,
    attributes: Array.isArray(s.attributes)
      ? (s.attributes as { name: string; value: string }[])
      : [],
    vendorId: (s.vendorId as string | undefined) || "",
    vendorName: (s.vendorName as string | undefined) || "",
    avatar: (s.avatar as string | null | undefined) ?? null,
    area: (s.area as string | null | undefined) ?? null,
    state: (s.state as string | null | undefined) ?? null,
    whatsapp: (s.whatsapp as string | null | undefined) ?? null,
    distanceKm: typeof s.distanceKm === "number" ? s.distanceKm : null,
    score: typeof s.score === "number" ? s.score : 0,
  };
}

/** Same reconstruction, for an off-Velte candidate's own snapshot. `id`
 *  overridden the same way and for the same reason as `productId` above. */
function reconstructExternalOffer(
  candidate: ShoppingPlanCandidate,
): ExternalOffer | null {
  const s = candidate.snapshot as Record<string, unknown> | null;
  if (!s || typeof s !== "object") return null;
  return {
    id: candidate.id,
    title: (s.title as string | undefined) || "Option",
    priceText: (s.priceText as string | null | undefined) ?? null,
    imageUrl: (s.imageUrl as string | null | undefined) ?? null,
    galleryUrls: Array.isArray(s.galleryUrls)
      ? (s.galleryUrls as string[])
      : [],
    description: (s.description as string | null | undefined) ?? null,
    attributes: Array.isArray(s.attributes)
      ? (s.attributes as { name: string; value: string }[])
      : [],
    merchant: (s.merchant as string | null | undefined) ?? null,
    // Not read by pickExternalRecommendation at all — kept only to satisfy
    // ExternalOffer's shape.
    platform: (s.platform as ExternalOffer["platform"] | undefined) ?? "jumia",
    source: (s.source as string | undefined) || "serper",
    url: (s.url as string | undefined) || "",
    isDirectLink: Boolean(s.isDirectLink),
  };
}

async function recommendationFor(
  itemLabel: string,
  candidates: ShoppingPlanCandidate[],
): Promise<SearchRecommendation | null> {
  const available = candidates.filter(latestAvailable);
  const velteCandidates = available
    .filter((c) => c.source === "velte_product")
    .map(reconstructVendorMatch)
    .filter((m): m is VendorMatch => m !== null);
  if (velteCandidates.length >= 2) {
    return pickRecommendation({ query: itemLabel, products: velteCandidates });
  }

  const externalCandidates = available
    .filter((c) => c.source === "external")
    .map(reconstructExternalOffer)
    .filter((o): o is ExternalOffer => o !== null);
  if (externalCandidates.length >= 2) {
    return pickExternalRecommendation({
      query: itemLabel,
      offers: externalCandidates,
    });
  }

  return null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // VENDOR wins when both cookies exist — see search/route.ts's own comment
  // (2026-09-22) on why this is safe unconditionally, no separate link
  // check needed here.
  const vendorAuth = await getOptionalVendorAuth();
  const buyerAuth = vendorAuth ? null : await getOptionalBuyerAuth();
  if (!buyerAuth && !vendorAuth) {
    return jsonError(401, "Sign in to view your Shopping Plans.");
  }

  const { id } = await params;
  let plan: ShoppingPlan;
  try {
    ({ plan } = await backendData<{ plan: ShoppingPlan }>(
      `/shopping-plans/${encodeURIComponent(id)}`,
      { cookie: vendorAuth?.cookie ?? buyerAuth?.cookie ?? "" },
    ));
  } catch (err) {
    if (err instanceof BackendError && err.status < 500) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[shopping-plan] recommendations: plan load failed:", err);
    return NextResponse.json(
      { error: "Couldn't load that Shopping Plan." },
      { status: 502 },
    );
  }

  // One recommendation call per eligible item, all concurrent — each call
  // already carries its own hard timeout (see recommendResults.ts), so
  // nothing here needs a second one. A single item's failure (or having
  // fewer than 2 available candidates) yields `null` for that item only,
  // same "never a new failure mode" contract pickRecommendation itself
  // already holds to.
  const entries = await Promise.all(
    plan.items
      .filter((item) => !item.removed)
      .map(async (item) => {
        try {
          const recommendation = await recommendationFor(
            item.label,
            item.candidates,
          );
          return [item.id, recommendation] as const;
        } catch (err) {
          console.error(
            `[shopping-plan] recommendations: item ${item.id} failed:`,
            err,
          );
          return [item.id, null] as const;
        }
      }),
  );

  const recommendations: Record<string, SearchRecommendation | null> =
    Object.fromEntries(entries);
  return NextResponse.json({ recommendations });
}
