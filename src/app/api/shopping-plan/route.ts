import { NextResponse, after } from "next/server";

import { fail, jsonError } from "@/lib/server/guards";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { backendData } from "@/lib/server/backend";
import { affordCredits, chargeCredits } from "@/lib/server/creditLedger";
import {
  buyerAuthedTarget,
  resolvePendingItems,
} from "@/lib/server/shoppingPlanResolver";
import type {
  BuyerLocation,
  ShoppingPlan,
  ShoppingPlanDraft,
} from "@/types/search";

// POST /api/shopping-plan — confirms a checklist (built by /api/search's
// "plan" tool turn — see shoppingPlanTool.ts) and builds the real thing.
//
// REWIRED 2026-09-10 for real background progress (replacing the v1
// "resolve everything, then respond" shape) — found live: a buyer who
// navigated to Your Plans (a real route, not a modal — see PlansPage.tsx)
// or just closed the tab mid-build lost the plan entirely, because nothing
// existed anywhere until the whole synchronous request finished. Now the
// plan is CREATED and returned immediately (status "building", every item
// "pending"), and the actual multi-source search runs AFTER the response is
// sent (Next's `after()` — the officially-supported way to keep doing real
// work once a response has gone out, which is what makes this safe on a
// serverless platform that would otherwise freeze the function the instant
// the response closes). Each item is PATCHed in as it resolves
// (.../items/:itemId, the same endpoint the buyer's own "Replace" edit
// already uses), so Your Plans and a reopened /chat both see genuine, live
// progress — not a fake timer — regardless of whether the buyer stuck
// around. POST /shopping-plan/:id/finish flips it to "active" once every
// item has been attempted.
//
// THE credit check still lives here, before the plan is even created — see
// this file's own earlier comment on "check before, charge after". The
// CHARGE itself now fires once the background resolve is actually done
// (in the `after()` block), not the instant the plan is created, since
// creating the record is no longer the same moment the work is delivered.
//
// Not streamed to the BROWSER (still true, and still deliberate) — the
// buyer gets one fast response with the plan id, then polls/reopens Your
// Plans or the conversation to watch it fill in, rather than holding one
// long-lived connection open.
//
// SEQUENTIAL, one item at a time (2026-09-11, reversed from this file's own
// original Promise.all-over-everything shape, per explicit request) — see
// shoppingPlanResolver.ts's own comment for why that trade is fine here:
// nothing about this loop is holding a request open, so there is no
// latency being traded away, only total background runtime. The same file
// is now the ONLY place this resolution logic lives, shared with
// /api/shopping-plan/sweep's recovery pass (see that route).
//
// NO forced "trim to fit" pass any more (also 2026-09-11, also reversed) —
// the old version re-searched a plan's priciest FOUND items against a
// lowered ceiling whenever the total ran over budget, silently swapping in
// a cheaper substitute. Per explicit request: an item is never hidden or
// swapped out just because it pushes the total over budget — the real,
// verified find stands, and the plan's own total simply reads as over
// budget (ShoppingPlanTemplate.tsx and PlansPage.tsx already render that
// honestly). The goal is no dead ends, not a forced fit.

export async function POST(req: Request) {
  const auth = await getOptionalBuyerAuth();
  if (!auth) {
    return jsonError(401, "Sign in to build a shopping plan.");
  }

  const body = (await req.json().catch(() => null)) as {
    draft?: ShoppingPlanDraft;
    /** The chat turn id that rendered this checklist — a stable reference
     *  for THIS "start searching" click, which is what makes the create
     *  idempotent (see velte-backend's createPlan). A double-tap, a retry,
     *  or two tabs racing all land on the one plan instead of starting the
     *  whole multi-item search — and charging for it — twice. */
    clientRef?: string;
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

  // Created with every item "pending" — nothing has been searched yet, on
  // purpose. This is the whole point of the rewrite: the buyer gets a real
  // plan id back before a single search has run.
  let plan: ShoppingPlan;
  let reused = false;
  try {
    const created = await backendData<{ plan: ShoppingPlan; reused?: boolean }>(
      "/shopping-plan",
      {
        method: "POST",
        cookie: auth.cookie,
        body: {
          goalText: draft.goalText,
          totalBudgetKobo: draft.totalBudgetKobo,
          location: draft.location,
          categories: draft.categories,
          clientRef:
            typeof body?.clientRef === "string" ? body.clientRef : undefined,
          items: draft.items.map((it) => ({
            category: it.category,
            label: it.label,
            targetBudgetKobo: it.targetBudgetKobo,
            status: "pending",
          })),
        },
      },
    );
    plan = created.plan;
    reused = Boolean(created.reused);
  } catch (err) {
    return fail(err, "Couldn't start your shopping plan.");
  }

  // This click already started a job — hand back the plan it started and do
  // NOT launch a second background resolve over the same items (spec: a
  // double-tapped "Start searching" must not duplicate the work, or the
  // charge). Returned as a normal success: from the buyer's side the one
  // thing they asked for is underway, which is exactly true.
  if (reused) {
    return NextResponse.json({ plan, reused: true }, { status: 200 });
  }

  const buyerLocation: BuyerLocation | undefined =
    draft.location?.lat != null && draft.location?.lng != null
      ? { lat: draft.location.lat, lng: draft.location.lng }
      : undefined;
  const locationLabel =
    draft.location?.area ?? draft.location?.state ?? undefined;

  // The actual multi-source search — everything below runs AFTER the
  // response above has already gone out. See this file's own top comment
  // for why that's safe here and not just a fire-and-forget gamble.
  const target = buyerAuthedTarget(plan.id, auth.cookie);
  after(async () => {
    try {
      // Shared with the recovery sweep — see shoppingPlanResolver.ts's own
      // comment for why this is sequential and no longer trims to budget.
      await resolvePendingItems(
        plan.items,
        { buyerLocation, locationLabel },
        target,
      );
    } catch (err) {
      console.error("[shopping-plan] background resolve failed:", err);
    } finally {
      // Flips "building" -> "active" regardless of how the loop above
      // went — a plan that stays stuck "building" forever because ONE
      // item's search threw is worse than one that finishes honestly
      // showing whatever no_match rows it ended up with.
      try {
        await target.finish();
      } catch (err) {
        console.error("[shopping-plan] finish call failed:", err);
      }
      // Fire-and-forget, same as every other charge in this codebase —
      // moved here from the old synchronous ending, since THIS is the
      // moment the work is actually delivered now.
      void chargeCredits({
        actorType: "buyer",
        cookie: auth.cookie,
        action: "plan",
      });
    }
  });

  return NextResponse.json({ plan }, { status: 201 });
}
