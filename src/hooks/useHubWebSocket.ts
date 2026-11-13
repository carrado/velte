"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { HubTimelineItem } from "@/types/hub";
import { subscribeToHubNewListings } from "@/lib/hubSync";
import { sharedWsClient, type HubWsClientMessage } from "@/lib/wsClient";

export type HubDataChangeScope =
  | "adverts"
  | "boosts"
  | "community"
  | "performance"
  | "all";

interface UseHubWebSocketOptions {
  knownListingIds?: string[];
  onNewListings?: (items: HubTimelineItem[]) => void;
  onListingUpdated?: (
    productId: string,
    patch: Partial<HubTimelineItem>,
  ) => void;
  onListingRemoved?: (productId: string) => void;
  onHubDataChanged?: (scope: HubDataChangeScope) => void;
  enabled?: boolean;
}

interface UseHubWebSocketReturn {
  now: number;
  isConnected: boolean;
  checkForNewListings: () => void;
  broadcastListing: (items: HubTimelineItem | HubTimelineItem[]) => void;
}

function isTestItem(item: HubTimelineItem): boolean {
  if (!item) return false;
  if (item.id?.startsWith("test_")) return true;
  const title = (item.title || "").toLowerCase();
  const store = (item.storeName || "").toLowerCase();
  return (
    title.includes("test product") ||
    title.includes("vendor test") ||
    store.includes("vendor test")
  );
}

export function useHubWebSocket({
  knownListingIds = [],
  onNewListings,
  onListingUpdated,
  onListingRemoved,
  onHubDataChanged,
  enabled = true,
}: UseHubWebSocketOptions = {}): UseHubWebSocketReturn {
  const [status, setStatus] = useState<{ isConnected: boolean; now: number }>(
    () => sharedWsClient.getStatus(),
  );

  const knownIdsRef = useRef<string[]>(knownListingIds);
  const onNewListingsRef = useRef(onNewListings);
  const onListingUpdatedRef = useRef(onListingUpdated);
  const onListingRemovedRef = useRef(onListingRemoved);
  const onHubDataChangedRef = useRef(onHubDataChanged);

  useEffect(() => {
    knownIdsRef.current = knownListingIds;
    if (enabled && knownListingIds.length > 0) {
      sharedWsClient.registerHubInit(knownListingIds);
    }
  }, [knownListingIds, enabled]);

  useEffect(() => {
    onNewListingsRef.current = onNewListings;
  }, [onNewListings]);

  useEffect(() => {
    onListingUpdatedRef.current = onListingUpdated;
  }, [onListingUpdated]);

  useEffect(() => {
    onListingRemovedRef.current = onListingRemoved;
  }, [onListingRemoved]);

  useEffect(() => {
    onHubDataChangedRef.current = onHubDataChanged;
  }, [onHubDataChanged]);

  const checkForNewListings = useCallback(() => {
    sharedWsClient.send({
      type: "CHECK_NEW_LISTINGS",
      knownListingIds: knownIdsRef.current,
    });
  }, []);

  const broadcastListing = useCallback(
    (items: HubTimelineItem | HubTimelineItem[]) => {
      const list = Array.isArray(items) ? items : [items];
      if (list.length === 0) return;

      sharedWsClient.send({
        type: "NEW_LISTINGS",
        items: list,
      });

      fetch("/api/hub/ws", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: list }),
      }).catch(() => {});
    },
    [],
  );

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    sharedWsClient.registerHubInit(knownIdsRef.current);

    const unsubscribeStatus = sharedWsClient.subscribeStatus(
      (isConnected, now) => {
        setStatus({ isConnected, now });
      },
    );

    const unsubscribeMsg = sharedWsClient.subscribe(
      (data: HubWsClientMessage) => {
        if (
          data.type === "NEW_LISTINGS" &&
          Array.isArray(data.items) &&
          data.items.length > 0
        ) {
          const validItems = data.items.filter((item) => !isTestItem(item));
          if (validItems.length > 0) {
            onNewListingsRef.current?.(validItems);
          }
        } else if (
          data.type === "LISTING_UPDATED" &&
          data.productId &&
          data.patch
        ) {
          onListingUpdatedRef.current?.(data.productId, data.patch);
        } else if (data.type === "LISTING_REMOVED" && data.productId) {
          onListingRemovedRef.current?.(data.productId);
        } else if (data.type === "HUB_DATA_CHANGED") {
          onHubDataChangedRef.current?.(data.scope ?? "all");
        }
      },
    );

    const unsubscribeSync = subscribeToHubNewListings((incomingItems) => {
      if (incomingItems && incomingItems.length > 0) {
        onNewListingsRef.current?.(incomingItems);
      }
    });

    return () => {
      unsubscribeStatus();
      unsubscribeMsg();
      unsubscribeSync();
    };
  }, [enabled]);

  return {
    now: status.now,
    isConnected: status.isConnected,
    checkForNewListings,
    broadcastListing,
  };
}
