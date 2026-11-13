"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { fetchVendorBuyerRequests } from "@/services/vendorBuyerRequests";
import { vendorRequestOutcome } from "@/lib/vendorRequestOutcome";
import { useUserStore } from "@/store/userStore";
import { sharedWsClient, type HubWsClientMessage } from "@/lib/wsClient";

/** Refetch fallback cadence when WebSocket is disconnected. */
const REFRESH_MS = 60_000;

/**
 * How many buyer requests are waiting on this vendor — matched to them,
 * still open, and neither accepted nor declined yet. Drives the count bubble
 * on the "Buyer Requests" nav item (Sidebar + BottomNav).
 *
 * Connected to the shared WebSocket for instant detection (`NEW_BUYER_REQUESTS`,
 * `BUYER_REQUEST_DECIDED`) and automatically updates the shared React Query cache.
 */
export function usePendingBuyerRequests(): number {
  const queryClient = useQueryClient();
  const userId = useUserStore((s) => s.user?.id);
  const [wsConnected, setWsConnected] = useState(
    () => sharedWsClient.getStatus().isConnected,
  );

  useEffect(() => {
    const unsubStatus = sharedWsClient.subscribeStatus((connected) => {
      setWsConnected(connected);
    });

    if (userId) {
      sharedWsClient.registerUserSubscription({
        userId,
        role: "vendor",
      });
    }

    const unsubMsg = sharedWsClient.subscribe((msg: HubWsClientMessage) => {
      if (msg.type === "NEW_BUYER_REQUESTS") {
        if (Array.isArray(msg.requests)) {
          queryClient.setQueryData(queryKeys.vendorBuyerRequests.list, {
            requests: msg.requests,
          });
        } else {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.vendorBuyerRequests.list,
          });
        }
      } else if (
        msg.type === "NEW_BUYER_REQUEST" ||
        msg.type === "BUYER_REQUEST_DECIDED"
      ) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.vendorBuyerRequests.list,
        });
      }
    });

    return () => {
      unsubStatus();
      unsubMsg();
    };
  }, [userId, queryClient]);

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
    refetchInterval: wsConnected ? false : REFRESH_MS,
  });

  // Sync known request IDs with WebSocket server when cache populates
  const listData = queryClient.getQueryData<{ requests: { id: string }[] }>(
    queryKeys.vendorBuyerRequests.list,
  );
  useEffect(() => {
    if (userId && listData?.requests) {
      sharedWsClient.registerUserSubscription({
        userId,
        role: "vendor",
        knownRequestIds: listData.requests.map((r) => r.id),
      });
    }
  }, [userId, listData]);

  return data ?? 0;
}

/** "1".."9", then "9+" — a nav bubble has room for one or two characters. */
export function badgeLabel(count: number): string {
  return count > 9 ? "9+" : String(count);
}
