"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { HubTimelineItem } from "@/types/hub";
import { subscribeToHubNewListings } from "@/lib/hubSync";

export interface HubWsMessage {
  type:
    | "TIME_TICK"
    | "NEW_LISTINGS"
    | "INIT"
    | "CHECK_NEW_LISTINGS"
    | "PONG"
    | "UP_TO_DATE";
  now?: number;
  items?: HubTimelineItem[];
  knownListingIds?: string[];
}

interface UseHubWebSocketOptions {
  knownListingIds?: string[];
  onNewListings?: (items: HubTimelineItem[]) => void;
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

const DEFAULT_WS_PORT = 4002;

function getWebSocketUrl(): string {
  if (typeof window === "undefined") return "";

  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }

  const port = process.env.NEXT_PUBLIC_WS_PORT || DEFAULT_WS_PORT;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const hostname = window.location.hostname || "localhost";
  return `${protocol}//${hostname}:${port}`;
}

export function useHubWebSocket({
  knownListingIds = [],
  onNewListings,
  enabled = true,
}: UseHubWebSocketOptions = {}): UseHubWebSocketReturn {
  const [now, setNow] = useState<number>(() => Date.now());
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const knownIdsRef = useRef<string[]>(knownListingIds);
  const onNewListingsRef = useRef(onNewListings);

  // Keep refs up-to-date
  useEffect(() => {
    knownIdsRef.current = knownListingIds;
  }, [knownListingIds]);

  useEffect(() => {
    onNewListingsRef.current = onNewListings;
  }, [onNewListings]);

  // Check for new listings manually or on trigger
  const checkForNewListings = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const payload: HubWsMessage = {
        type: "CHECK_NEW_LISTINGS",
        knownListingIds: knownIdsRef.current,
      };
      socketRef.current.send(JSON.stringify(payload));
    }
  }, []);

  // Broadcast newly created listing to other clients
  const broadcastListing = useCallback(
    (items: HubTimelineItem | HubTimelineItem[]) => {
      const list = Array.isArray(items) ? items : [items];
      if (list.length === 0) return;

      if (
        socketRef.current &&
        socketRef.current.readyState === WebSocket.OPEN
      ) {
        const payload: HubWsMessage = {
          type: "NEW_LISTINGS",
          items: list,
        };
        socketRef.current.send(JSON.stringify(payload));
      }

      // Also notify via API endpoint so other processes/tabs know
      fetch("/api/hub/ws", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: list }),
      }).catch(() => {
        // Best-effort
      });
    },
    [],
  );

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let unmounted = false;

    // Wake up / ensure the backend WebSocket server is active
    fetch("/api/hub/ws").catch(() => {});

    function connect() {
      if (unmounted) return;

      const wsUrl = getWebSocketUrl();
      if (!wsUrl) return;

      try {
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          if (unmounted) {
            ws.close();
            return;
          }
          setIsConnected(true);
          reconnectAttemptsRef.current = 0;

          // Send INIT with current known IDs to immediately check for newer listings
          const initPayload: HubWsMessage = {
            type: "INIT",
            knownListingIds: knownIdsRef.current,
          };
          ws.send(JSON.stringify(initPayload));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as HubWsMessage;

            // 1. Clock tick from WebSocket server -> triggers live relative timestamp updates across feed
            if (data.type === "TIME_TICK" && typeof data.now === "number") {
              setNow(data.now);
            }

            // 2. New listings pushed from WebSocket server -> notify consumer
            if (
              data.type === "NEW_LISTINGS" &&
              Array.isArray(data.items) &&
              data.items.length > 0
            ) {
              if (typeof data.now === "number") {
                setNow(data.now);
              }
              const validItems = data.items.filter((item) => !isTestItem(item));
              if (validItems.length > 0) {
                onNewListingsRef.current?.(validItems);
              }
            }
          } catch {
            // Ignore parse errors
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          socketRef.current = null;

          if (!unmounted) {
            // Reconnect with backoff capped at 8 seconds
            const delay = Math.min(
              1000 * Math.pow(1.5, reconnectAttemptsRef.current),
              8000,
            );
            reconnectAttemptsRef.current += 1;
            reconnectTimeoutRef.current = setTimeout(connect, delay);
          }
        };

        ws.onerror = () => {
          // Socket will fire onclose after onerror, which handles reconnection
          try {
            ws.close();
          } catch {
            // ignore
          }
        };
      } catch {
        // Fallback retry
        if (!unmounted) {
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        }
      }
    }

    connect();

    // Local interval ticker fallback (ensures time never freezes if WS is momentarily disconnected)
    const localTickInterval = setInterval(() => {
      setNow(Date.now());
    }, 15000);

    // Also hook into tab-to-tab BroadcastChannel & ServiceWorker sync
    const unsubscribeSync = subscribeToHubNewListings((incomingItems) => {
      if (!unmounted && incomingItems && incomingItems.length > 0) {
        onNewListingsRef.current?.(incomingItems);
      }
    });

    return () => {
      unmounted = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      clearInterval(localTickInterval);
      unsubscribeSync();
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch {
          // ignore
        }
        socketRef.current = null;
      }
    };
  }, [enabled]);

  return {
    now,
    isConnected,
    checkForNewListings,
    broadcastListing,
  };
}
