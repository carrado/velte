"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { fetchVendorBuyerRequests } from "@/services/vendorBuyerRequests";
import { vendorRequestOutcome } from "@/lib/vendorRequestOutcome";

/** Refetch cadence for the nav badge. A buyer request's whole window is 48h
 *  and the vendor also gets a push and an SMS, so a minute of lag on a
 *  number in the nav is nothing — this just keeps an open dashboard tab from
 *  showing a stale count all afternoon. */
const REFRESH_MS = 60_000;

/**
 * How many buyer requests are waiting on this vendor — matched to them,
 * still open, and neither accepted nor declined yet. Drives the count bubble
 * on the "Buyer Requests" nav item (Sidebar + BottomNav, 2026-09-24).
 *
 * Same queryKey and fetch as the Buyer Requests page and the Products page's
 * OpportunitiesBanner, so all three share one cache entry: the detail page's
 * accept/decline already invalidates ["vendor-buyer-requests"], which is
 * what makes the badge drop the moment the vendor answers. Since 2026-09-24
 * the list also carries the vendor's answered history, so "pending" is read
 * through vendorRequestOutcome (open AND unanswered), which also covers a
 * lapsed request the backend's hourly sweep hasn't flipped yet.
 */
export function usePendingBuyerRequests(): number {
  const { data } = useQuery({
    queryKey: queryKeys.vendorBuyerRequests.list,
    queryFn: fetchVendorBuyerRequests,
    // `select` shapes only THIS observer's view — the shared cache keeps
    // the full list the page and banner read.
    select: ({ requests }) => {
      const now = Date.now();
      return requests.filter((r) => vendorRequestOutcome(r, now) === "new")
        .length;
    },
    refetchInterval: REFRESH_MS,
  });
  return data ?? 0;
}

/** "1".."9", then "9+" — a nav bubble has room for one or two characters. */
export function badgeLabel(count: number): string {
  return count > 9 ? "9+" : String(count);
}
