import { backendData } from "@/lib/server/backend";
import {
  collectPlanItem,
  type CollectedPlanItem,
  type ResolvedPlanItem,
} from "@/lib/server/ai/pickPlanItem";
import type { BuyerLocation, ShoppingPlanItem } from "@/types/search";

// The Shopping Plan's actual multi-source item resolution — shared between
// /api/shopping-plan's own POST (the ordinary "just confirmed, start
// searching" path) and /api/shopping-plan/sweep (the recovery pass for a
// plan whose background resolve never finished — see that route's own
// comment). One function, two callers, so the resolution behaviour can
// never quietly drift between the normal path and the recovery one.
//
// SEQUENTIAL, not Promise.all (2026-09-11, reversed from the original
// build's parallel-everything shape, per explicit request): a plan's items
// resolve one at a time. Slower wall-clock for a big checklist, but that
// was always the point of moving this into a background job in the first
// place — nothing here is holding the buyer's own request open, so there is
// no latency being traded away, only total background runtime, which the
// SMS-on-start message already tells the buyer to expect ("this can take a
// little while").

function patchItemBody(
  result: ResolvedPlanItem,
  extras: {
    results?: CollectedPlanItem["results"];
    error?: string | null;
  } = {},
) {
  return {
    status: result.status,
    source: result.source,
    productId: result.productId,
    vendorId: result.vendorId,
    externalOfferId: result.externalOfferId,
    name: result.name,
    imageUrl: result.imageUrl,
    priceKobo: result.priceKobo,
    merchant: result.merchant,
    url: result.url,
    results: extras.results ?? [],
    error: extras.error ?? null,
  };
}

/** An item whose search THREW — distinct from one that searched fine and
 *  found nothing (`no_match`). The buyer is told different things for each,
 *  and only this one is worth a retry. */
const FAILED_ITEM: ResolvedPlanItem = {
  status: "failed",
  source: null,
  productId: null,
  vendorId: null,
  externalOfferId: null,
  name: null,
  imageUrl: null,
  priceKobo: null,
  merchant: null,
  url: null,
};

/** Where to send each item's PATCH and the plan's own finish call — the
 *  buyer-authed route (a cookie) for the ordinary flow, the cron-secret
 *  `/internal/...` mount for the recovery sweep, which has no buyer session
 *  to forward. See velte-backend's shoppingPlan.routes.js for both mounts. */
export interface PlanResolveTarget {
  planId: string;
  patch(itemId: string, body: ReturnType<typeof patchItemBody>): Promise<void>;
  finish(): Promise<void>;
}

export function buyerAuthedTarget(
  planId: string,
  cookie: string,
): PlanResolveTarget {
  return {
    planId,
    patch: (itemId, body) =>
      backendData(
        `/shopping-plan/${encodeURIComponent(planId)}/items/${encodeURIComponent(itemId)}`,
        { method: "PATCH", cookie, body },
      ),
    finish: () =>
      backendData(`/shopping-plan/${encodeURIComponent(planId)}/finish`, {
        method: "POST",
        cookie,
      }),
  };
}

export function cronAuthedTarget(planId: string): PlanResolveTarget {
  const headers = { "x-cron-secret": process.env.CRON_SECRET ?? "" };
  return {
    planId,
    patch: (itemId, body) =>
      backendData(
        `/shopping-plan/internal/${encodeURIComponent(planId)}/items/${encodeURIComponent(itemId)}`,
        { method: "PATCH", headers, body },
      ),
    finish: () =>
      backendData(
        `/shopping-plan/internal/${encodeURIComponent(planId)}/finish`,
        {
          method: "POST",
          headers,
        },
      ),
  };
}

/**
 * Resolves every still-`pending` item in `items`, one at a time, PATCHing
 * each in as it's known. Never throws — a single item's search or write
 * failing is recorded on that item alone (`failed`/a swallowed patch error)
 * and the loop moves on, exactly as the original parallel version did per
 * item; the only real behaviour change here is the ordering itself.
 *
 * Does NOT call `target.finish()` — the two callers finish at different
 * moments (right after this resolves, for the normal path; only once
 * confirmed no items are left pending, for the sweep, which may need more
 * than one pass) and stay in charge of that themselves.
 */
export async function resolvePendingItems(
  items: ShoppingPlanItem[],
  location: { buyerLocation?: BuyerLocation; locationLabel?: string },
  target: PlanResolveTarget,
): Promise<void> {
  for (const it of items) {
    if (it.status !== "pending") continue;

    let result: ResolvedPlanItem = FAILED_ITEM;
    let results: CollectedPlanItem["results"] = [];
    let error: string | null = null;
    try {
      const collected = await collectPlanItem({
        label: it.label,
        targetBudgetKobo: it.targetBudgetKobo,
        buyerLocation: location.buyerLocation,
        locationLabel: location.locationLabel,
      });
      result = collected.picked;
      results = collected.results;
    } catch (err) {
      console.error(`[shopping-plan] item resolve threw (${it.label}):`, err);
      error = "search_error";
    }

    try {
      await target.patch(it.id, patchItemBody(result, { results, error }));
    } catch (err) {
      console.error(`[shopping-plan] item patch failed (${it.id}):`, err);
    }
  }
}
