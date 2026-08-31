import { NextResponse } from "next/server";

import { buildNegotiationBrief } from "@/lib/server/ai/negotiationBrief";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { getOptionalVendorAuth, jsonError } from "@/lib/server/guards";
import { chargeCredits, creditMessage } from "@/lib/server/creditLedger";
import type { PriceBand, PriceBandChannel } from "@/types/search";

// POST /api/price-brief — "what should I actually offer?" (2026-08-31).
//
// Its own route rather than part of a search turn, and that is the whole
// design. A brief SPENDS a metered allowance (2 free, 20 on Plus), so it has
// to be something the buyer asks for on purpose. Attaching it to every band
// would burn a free buyer's two on the first two searches they ran, neither
// of which they intended to haggle over — they would discover the feature by
// finding it already gone.
//
// It is also why the band block itself stays uninteractive, as its own file
// insists, and the offer lives in a separate strip below it: the band is an
// answer, and this is a thing you choose to do about the answer.
//
// COSTS NOTHING TO SERVE: no LLM, no external fetch, no database read beyond
// the meter itself. See negotiationBrief.ts on why it is metered anyway.

/** The band comes from the client, which is unusual here and worth stating.
 *
 *  It is the band the buyer was just shown, echoed back. The alternative was
 *  to re-read the stored turn from velte-backend, which is a round trip on a
 *  path that has none, and would not work for a band shown before the
 *  conversation was persisted.
 *
 *  What that gives up is small and bounded: a forged band produces a wrong
 *  brief for the person who forged it, and nothing else — no money moves, no
 *  other buyer sees it, and the meter is charged either way, so it buys the
 *  forger nothing. What it must NOT do is crash the route or produce NaN
 *  advice, so every number is checked below rather than trusted. */
function readChannel(raw: unknown): PriceBandChannel | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  if (c.id !== "local" && c.id !== "informal" && c.id !== "formal") return null;

  const nums = ["lowKobo", "midKobo", "highKobo", "count"] as const;
  for (const key of nums) {
    const value = c[key];
    // Finite, positive and sane. An Infinity or a negative would sail through
    // the arithmetic in negotiationBrief.ts and come out the other side as a
    // figure printed next to the word "offer".
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      return null;
    }
  }

  const low = c.lowKobo as number;
  const mid = c.midKobo as number;
  const high = c.highKobo as number;
  // Percentiles that aren't ordered aren't percentiles.
  if (!(low <= mid && mid <= high)) return null;

  return {
    id: c.id,
    count: c.count as number,
    lowKobo: low,
    midKobo: mid,
    highKobo: high,
    ranged: c.ranged === true,
  };
}

function readBand(raw: unknown): PriceBand | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;

  if (typeof b.query !== "string" || !b.query.trim()) return null;
  if (b.confidence !== "band" && b.confidence !== "rough") return null;
  if (!Array.isArray(b.channels)) return null;

  const channels: PriceBandChannel[] = [];
  for (const raw of b.channels) {
    const channel = readChannel(raw);
    if (!channel) return null;
    channels.push(channel);
  }

  const totalCount =
    typeof b.totalCount === "number" && Number.isFinite(b.totalCount)
      ? Math.max(0, Math.trunc(b.totalCount))
      : 0;
  const usedCount =
    typeof b.usedCount === "number" && Number.isFinite(b.usedCount)
      ? Math.max(0, Math.trunc(b.usedCount))
      : 0;
  const gapKobo =
    typeof b.gapKobo === "number" && Number.isFinite(b.gapKobo) && b.gapKobo > 0
      ? b.gapKobo
      : null;
  const cheapestChannel =
    b.cheapestChannel === "local" ||
    b.cheapestChannel === "informal" ||
    b.cheapestChannel === "formal"
      ? b.cheapestChannel
      : null;

  return {
    query: b.query.slice(0, 200),
    confidence: b.confidence,
    channels,
    // Never read by the brief — the `listings` rung can't produce one — so
    // it is normalised away rather than validated.
    listings: [],
    totalCount,
    usedCount,
    gapKobo,
    cheapestChannel,
    verdict: null,
    negotiable: true,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const band = readBand((body as { band?: unknown } | null)?.band);
    if (!band) {
      return jsonError(400, "A price band is required to build a brief.");
    }

    // Built BEFORE the meter is touched, exactly as the band does it in
    // /api/search: a buyer must never be charged an allowance for a brief
    // that turned out to be unbuildable. Ordering the other way is the kind
    // of quiet unfairness nobody reports and everybody feels.
    const brief = buildNegotiationBrief(band);
    if (!brief) {
      return jsonError(
        422,
        "There isn't enough price data here to work out an offer.",
      );
    }

    // Buyer wins when both cookies are present — the same precedence
    // resolveActor uses on the backend, and the same order /api/search reads
    // them in. Getting this backwards would meter a vendor's buyer session
    // against their vendor row.
    const buyerAuth = await getOptionalBuyerAuth();
    const vendorAuth = buyerAuth ? null : await getOptionalVendorAuth();
    const actorType = buyerAuth ? "buyer" : vendorAuth ? "vendor" : "guest";
    const decision = await chargeCredits({
      actorType,
      cookie: buyerAuth?.cookie ?? vendorAuth?.cookie ?? null,
      action: "brief",
    });

    if (!decision.allowed) {
      // 200, not an error status. A spent allowance is a normal outcome and
      // the client renders it as a nudge rather than a failure — the same
      // call /api/usage/consume makes on the backend, for the same reason.
      return NextResponse.json({
        brief: null,
        refusal: {
          message: creditMessage(decision),
          balance: decision.balance,
          cost: decision.cost,
          isGuest: decision.isGuest,
        },
      });
    }

    return NextResponse.json({ brief, refusal: null });
  } catch (err) {
    console.error("[price-brief] failed:", err);
    return jsonError(500, "Couldn't work out an offer just now.");
  }
}
