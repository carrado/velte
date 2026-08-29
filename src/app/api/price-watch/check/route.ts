import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { fetchPageMeta } from "@/lib/server/connectors/pageMeta";
import { parseOfferPrice } from "@/lib/priceText";

// POST /api/price-watch/check — the external price-watch checker.
//
// Called by velte-backend's own sweep (jobs/priceWatch.job.js), NOT by a
// browser and NOT by a third-party scheduler — the schedule lives next to
// the data it drives rather than in a web dashboard nobody reading this code
// can see.
//
// It lives in THIS repo for one reason: re-reading a Jumia/Konga/Jiji price
// means parsing that page, and pageMeta.ts already does exactly that — it is
// what put the price on the card in the first place. A second implementation
// over there would drift from this one and quietly start disagreeing about
// what a listing costs. So the backend owns the schedule and the data, and
// this route owns the parsing.
//
// Shape of a tick:
//   1. ask the backend which watches are due (it owns the schedule)
//   2. re-read each listing's page here
//   3. hand the prices back; the backend decides what counts as a drop and
//      sends the alerts, because those rules belong next to the data
//
// Deliberately does a SMALL batch per tick. Vercel's function ceiling is
// 60s and every watch is an outbound page fetch, so a tick that tried to do
// everything would time out and accomplish nothing. Watches are returned
// oldest-checked-first, so successive ticks work through the backlog.

export const maxDuration = 60;

// Comfortably inside the budget: pageMeta caps the whole batch with its own
// 5s timeout and fetches at a small concurrency, so this is bounded by the
// number of round trips to the backend, not by the page reads.
const BATCH = 20;

interface DueWatch {
  _id: string;
  kind: "external";
  url: string | null;
  label: string;
  lastPriceKobo: number;
}

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  // Fails closed. An unset secret leaves an endpoint that triggers email
  // open to anyone who finds the URL, so it refuses to run at all rather
  // than running unauthenticated.
  if (!secret) {
    return NextResponse.json(
      { error: "Checker not configured." },
      { status: 503 },
    );
  }
  if (req.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  try {
    const { watches } = await backendData<{ watches: DueWatch[] }>(
      `/price-watch/due?limit=${BATCH}`,
      { headers: { "x-cron-secret": secret } },
    );

    if (!watches.length) {
      return NextResponse.json({ checked: 0, message: "Nothing due." });
    }

    const urls = watches
      .map((w) => w.url)
      .filter((u): u is string => Boolean(u));
    const meta = await fetchPageMeta(urls);

    const results = watches.map((watch) => {
      const found = watch.url ? meta.get(watch.url) : null;
      // parseOfferPrice is deliberately strict — exactly one number in the
      // string or nothing (see its own comment). A page that now shows a
      // range, or "call for price", reads as a failed check rather than as
      // a price change, because guessing here would email someone about a
      // drop that didn't happen.
      const naira = parseOfferPrice(found?.priceText ?? null);
      if (naira == null) return { id: watch._id, failed: true };
      return { id: watch._id, priceKobo: Math.round(naira * 100) };
    });

    const report = await backendData<{
      checked: number;
      dropped: number;
      notified: number;
    }>("/price-watch/report", {
      method: "POST",
      body: { results },
      headers: { "x-cron-secret": secret },
    });

    return NextResponse.json(report);
  } catch (err) {
    console.error("[price-watch] check failed:", err);
    return NextResponse.json({ error: "Check failed." }, { status: 500 });
  }
}
