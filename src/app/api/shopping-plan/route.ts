import { NextResponse } from "next/server";

import { fail, jsonError } from "@/lib/server/guards";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { backendData } from "@/lib/server/backend";
import { affordCredits, chargeCredits } from "@/lib/server/creditLedger";
import { resolvePlanItem } from "@/lib/server/ai/pickPlanItem";
import type {
  BuyerLocation,
  ShoppingPlan,
  ShoppingPlanDraft,
} from "@/types/search";

// POST /api/shopping-plan — confirms a checklist (built by /api/search's
// "plan" tool turn — see shoppingPlanTool.ts) and builds the real thing:
// searches every item (Velte first, external gap-fill, both already
// budget-aware — see pickPlanItem.ts), applies the over-budget trim pass,
// then persists the resolved plan to velte-backend.
//
// THE credit check for the whole feature lives here, not on the draft turn
// — see route.ts's own "plan" short-circuit for why the checklist itself
// is unbilled. This is the one place real search work (and real cost)
// actually happens, so it's the one place "check before, charge after"
// applies.
//
// Not streamed (2026-09-06, v1): a plan can run a dozen-plus item searches
// in parallel, which already keeps wall-clock time close to one search's
// own, so the simpler plain request/response was chosen over threading a
// second SSE surface through the composer for this one endpoint. Worth
// revisiting if real category counts make that latency feel long.

const MAX_TRIM_ATTEMPTS = 4;
const TRIM_FACTOR = 0.8;

export async function POST(req: Request) {
  const auth = await getOptionalBuyerAuth();
  if (!auth) {
    return jsonError(401, "Sign in to build a shopping plan.");
  }

  const body = (await req.json().catch(() => null)) as {
    draft?: ShoppingPlanDraft;
  } | null;
  const draft = body?.draft;
  if (
    !draft ||
    typeof draft.goalText !== "string" ||
    !draft.goalText.trim() ||
    typeof draft.totalBudgetKobo !== "number" ||
    draft.totalBudgetKobo <= 0 ||
    !Array.isArray(draft.categories) ||
    !draft.categories.length ||
    !Array.isArray(draft.items) ||
    !draft.items.length
  ) {
    return jsonError(400, "A confirmed checklist is required.");
  }

  const usage = await affordCredits({
    actorType: "buyer",
    cookie: auth.cookie,
    action: "plan",
  });
  if (!usage.allowed) {
    return NextResponse.json(
      {
        error: "Not enough credits for a shopping plan.",
        code: "insufficient_credits",
        balance: usage.balance,
        cost: usage.cost,
      },
      { status: 402 },
    );
  }

  const buyerLocation: BuyerLocation | undefined =
    draft.location?.lat != null && draft.location?.lng != null
      ? { lat: draft.location.lat, lng: draft.location.lng }
      : undefined;
  const locationLabel =
    draft.location?.area ?? draft.location?.state ?? undefined;

  try {
    // Every item resolved in parallel — same "Velte first, external for
    // gaps" pipeline whichever item it is; see resolvePlanItem's own
    // comment for the full reasoning.
    let resolved = await Promise.all(
      draft.items.map(async (it) => ({
        category: it.category,
        label: it.label,
        targetBudgetKobo: it.targetBudgetKobo,
        result: await resolvePlanItem({
          label: it.label,
          targetBudgetKobo: it.targetBudgetKobo,
          buyerLocation,
          locationLabel,
        }),
      })),
    );

    // The optimization pass (product spec's own "trim to fit"): if the
    // found items sum over the stated total, re-resolve the most expensive
    // FOUND items against a lowered ceiling, one round at a time, stopping
    // once under budget or out of rounds. Only ever SUBSTITUTES a real,
    // independently-verified cheaper find — never invents a discount.
    for (let attempt = 0; attempt < MAX_TRIM_ATTEMPTS; attempt++) {
      const spent = resolved.reduce(
        (sum, r) => sum + (r.result.priceKobo ?? 0),
        0,
      );
      if (spent <= draft.totalBudgetKobo) break;

      const overBy = spent - draft.totalBudgetKobo;
      const priciest = [...resolved]
        .filter((r) => r.result.status === "found")
        .sort((a, b) => (b.result.priceKobo ?? 0) - (a.result.priceKobo ?? 0))
        .slice(0, 3);
      if (!priciest.length) break;

      const retried = await Promise.all(
        priciest.map(async (r) => {
          const lowerCeiling = Math.max(
            Math.round((r.result.priceKobo ?? 0) * TRIM_FACTOR),
            Math.round((r.result.priceKobo ?? 0) - overBy),
          );
          const cheaper = await resolvePlanItem({
            label: r.label,
            targetBudgetKobo: lowerCeiling,
            buyerLocation,
            locationLabel,
          });
          return { label: r.label, cheaper };
        }),
      );

      let improved = false;
      resolved = resolved.map((r) => {
        const swap = retried.find(
          (t) =>
            t.label === r.label &&
            t.cheaper.status === "found" &&
            (t.cheaper.priceKobo ?? Infinity) <
              (r.result.priceKobo ?? Infinity),
        );
        if (swap) improved = true;
        return swap ? { ...r, result: swap.cheaper } : r;
      });
      if (!improved) break;
    }

    const items = resolved.map((r) => ({
      category: r.category,
      label: r.label,
      targetBudgetKobo: r.targetBudgetKobo,
      status: r.result.status,
      source: r.result.source,
      productId: r.result.productId,
      vendorId: r.result.vendorId,
      externalOfferId: r.result.externalOfferId,
      name: r.result.name,
      imageUrl: r.result.imageUrl,
      priceKobo: r.result.priceKobo,
      merchant: r.result.merchant,
      url: r.result.url,
    }));

    const { plan } = await backendData<{ plan: ShoppingPlan }>(
      "/shopping-plan",
      {
        method: "POST",
        cookie: auth.cookie,
        body: {
          goalText: draft.goalText,
          totalBudgetKobo: draft.totalBudgetKobo,
          location: draft.location,
          categories: draft.categories,
          items,
        },
      },
    );

    // Fire-and-forget, same as every other charge in this codebase — the
    // plan already exists and the buyer already has it; a slow/failed
    // charge write must never take the response down with it.
    void chargeCredits({
      actorType: "buyer",
      cookie: auth.cookie,
      action: "plan",
    });

    return NextResponse.json({ plan }, { status: 201 });
  } catch (err) {
    return fail(err, "Couldn't build your shopping plan.");
  }
}
