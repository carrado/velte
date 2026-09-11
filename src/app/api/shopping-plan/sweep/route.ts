import { NextResponse, after } from "next/server";

import { backendData } from "@/lib/server/backend";
import {
  cronAuthedTarget,
  resolvePendingItems,
} from "@/lib/server/shoppingPlanResolver";
import type { BuyerLocation, ShoppingPlan } from "@/types/search";

// POST /api/shopping-plan/sweep — the recovery pass for a plan whose
// background resolve never finished (2026-09-11).
//
// WHY this exists at all: a Shopping Plan's real search now runs entirely
// inside `after()` on the SAME request/process that answered "start
// searching" (see /api/shopping-plan's own top comment) — there is no
// separate always-on worker. That's fine for Render's free tier (no second
// service to provision, no extra always-on cost) as long as the process
// stays alive, which the existing cron-job.org ping to `/health` every 10
// minutes already guarantees (see CLAUDE.md's infra section) by keeping the
// service off its idle-sleep timer. What that keep-alive does NOT protect
// against is a genuine RESTART mid-job — a deploy, a crash — which kills
// whatever `after()` callback was still running, stranding a plan
// "building" forever with some items still "pending". Sequential
// resolution plus the new, more extensive per-item search (see
// pickPlanItem.ts) makes a single plan's background run take noticeably
// longer than the old parallel version, which makes that window bigger, not
// smaller — hence this.
//
// This is a SWEEP, not a queue worker: point ONE more free cron-job.org rule
// at this URL (say, every 5 minutes) and it costs nothing extra on Render's
// free tier — it's just another outbound ping the existing account already
// makes, not a second service. Gated by the shared CRON_SECRET (already in
// every environment's .env, unused since the old price-watch sweep was
// removed — see CLAUDE.md) rather than a buyer session, since there is no
// buyer here: velte-backend's own `/shopping-plan/internal/*` mount is the
// same secret-gated pattern on that side (see its routes file).
export async function POST(req: Request) {
  const expected = process.env.CRON_SECRET;
  const provided = req.headers.get("x-cron-secret");
  if (!expected || !provided || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let plans: ShoppingPlan[];
  try {
    const found = await backendData<{ plans: ShoppingPlan[] }>(
      "/shopping-plan/internal/stuck",
      { headers: { "x-cron-secret": expected } },
    );
    plans = found.plans;
  } catch (err) {
    console.error("[shopping-plan/sweep] couldn't list stuck plans:", err);
    return NextResponse.json(
      { error: "Couldn't list stuck plans." },
      { status: 502 },
    );
  }

  // Respond immediately with what was found — the actual re-resolution
  // continues in `after()`, same reasoning as the main POST route: nothing
  // here should hold the calling cron ping open while several plans'
  // remaining items work through, one at a time, in the background.
  after(async () => {
    for (const plan of plans) {
      try {
        const buyerLocation: BuyerLocation | undefined =
          plan.location?.lat != null && plan.location?.lng != null
            ? { lat: plan.location.lat, lng: plan.location.lng }
            : undefined;
        const locationLabel =
          plan.location?.area ?? plan.location?.state ?? undefined;

        const target = cronAuthedTarget(plan.id);
        await resolvePendingItems(
          plan.items,
          { buyerLocation, locationLabel },
          target,
        );
        await target.finish();
      } catch (err) {
        // One plan failing to sweep must never take the rest of the batch
        // down with it — same isolation principle as a single item failing
        // inside resolvePendingItems.
        console.error(`[shopping-plan/sweep] plan ${plan.id} failed:`, err);
      }
    }
  });

  return NextResponse.json({ swept: plans.length }, { status: 200 });
}
