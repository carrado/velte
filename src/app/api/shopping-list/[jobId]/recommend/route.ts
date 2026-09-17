import { NextResponse } from "next/server";

import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { getOptionalVendorAuth, jsonError } from "@/lib/server/guards";
import { backendData, BackendError } from "@/lib/server/backend";
import {
  pickRecommendation,
  pickExternalRecommendation,
} from "@/lib/server/ai/recommendResults";
import type { ShoppingListJob } from "@/types/shoppingList";

// POST /api/shopping-list/:jobId/recommend — "select the best" (spec
// §17-19). Runs the EXISTING single-pick recommendation engine once per
// item, over ONLY that item's own already-found results — never a fresh
// general search, and never the richer comparison-table builder (a 3-5
// item carousel doesn't need a criteria table; see this feature's own
// implementation plan for why the lighter pickRecommendation/
// pickExternalRecommendation pair is the right tool here).
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const buyerAuth = await getOptionalBuyerAuth();
  const vendorAuth = buyerAuth ? null : await getOptionalVendorAuth();
  if (!buyerAuth && !vendorAuth) {
    return jsonError(401, "Sign in to use Shopping Lists.");
  }
  const cookie = buyerAuth?.cookie ?? vendorAuth?.cookie ?? "";

  const { jobId } = await params;

  let job: ShoppingListJob;
  try {
    ({ job } = await backendData<{ job: ShoppingListJob }>(
      `/shopping-list-jobs/${encodeURIComponent(jobId)}`,
      { cookie },
    ));
  } catch (err) {
    if (err instanceof BackendError && err.status < 500) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[shopping-list] recommend: load failed:", err);
    return NextResponse.json(
      { error: "Couldn't load that shopping list." },
      { status: 502 },
    );
  }

  // Sequential, deliberately — same reasoning shoppingListJob.job.js's own
  // header gives for the background search itself: nothing here holds a
  // buyer-facing request open at scale (this is a bounded, one-off action
  // over a job's own small item list), so there's no latency worth
  // spending concurrency on, and it keeps this well clear of the LLM
  // provider's own rate limits.
  for (const item of job.items) {
    if (item.recommendation) continue;
    let recommendation = null;
    try {
      if (item.status === "found_velte" && item.velteResults.length >= 2) {
        recommendation = await pickRecommendation({
          query: item.label,
          products: item.velteResults,
        });
      } else if (
        item.status === "found_external" &&
        item.externalOffers.length >= 2
      ) {
        recommendation = await pickExternalRecommendation({
          query: item.label,
          offers: item.externalOffers,
        });
      }
    } catch (err) {
      console.error(
        `[shopping-list] recommend for item ${item.id} failed:`,
        err,
      );
    }
    if (!recommendation) continue;
    try {
      await backendData(
        `/shopping-list-jobs/${encodeURIComponent(jobId)}/items/${encodeURIComponent(item.id)}/recommendation`,
        {
          method: "PATCH",
          cookie,
          body: { recommendation },
        },
      );
    } catch (err) {
      console.error(
        `[shopping-list] saving recommendation for item ${item.id} failed:`,
        err,
      );
    }
  }

  // Re-fetched rather than assembled locally — the PATCH calls above are
  // the source of truth for what actually persisted, and a failed one
  // (logged, not thrown) should show up here as still missing rather than
  // an optimistic value the job never actually saved.
  try {
    const { job: updated } = await backendData<{ job: ShoppingListJob }>(
      `/shopping-list-jobs/${encodeURIComponent(jobId)}`,
      { cookie },
    );
    return NextResponse.json({ job: updated });
  } catch (err) {
    console.error("[shopping-list] recommend: reload failed:", err);
    return NextResponse.json({ job });
  }
}
