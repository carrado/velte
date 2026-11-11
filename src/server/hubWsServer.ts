import { WebSocketServer, WebSocket } from "ws";
import type { HubTimelineItem } from "@/types/hub";

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

// Global singleton across hot reloads in dev mode
declare global {
  // eslint-disable-next-line no-var
  var __hubWsServerInstance:
    | {
        wss: WebSocketServer;
        clients: Set<WebSocket>;
        knownIds: Set<string>;
        latestItems: HubTimelineItem[];
        intervalId: NodeJS.Timeout | null;
        pollIntervalId: NodeJS.Timeout | null;
      }
    | undefined;
}

export function isTestItem(item: HubTimelineItem): boolean {
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

export function clearWsCache(): void {
  if (global.__hubWsServerInstance) {
    global.__hubWsServerInstance.latestItems = [];
    global.__hubWsServerInstance.knownIds = new Set();
  }
}

const DEFAULT_WS_PORT = 4002;

export function getWsPort(): number {
  const envPort = process.env.HUB_WS_PORT || process.env.NEXT_PUBLIC_WS_PORT;
  if (envPort) {
    const parsed = parseInt(envPort, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_WS_PORT;
}

export function startHubWsServer(): {
  port: number;
  status: "already_running" | "started" | "error";
  clientCount: number;
} {
  const port = getWsPort();

  if (global.__hubWsServerInstance) {
    return {
      port,
      status: "already_running",
      clientCount: global.__hubWsServerInstance.clients.size,
    };
  }

  try {
    const wss = new WebSocketServer({ port }, () => {
      console.log(`[Hub WebSocket] Server listening on ws://localhost:${port}`);
    });

    const clients = new Set<WebSocket>();
    const knownIds = new Set<string>();
    let latestItems: HubTimelineItem[] = [];

    wss.on("connection", (ws: WebSocket) => {
      clients.add(ws);

      // Immediately send current timestamp to sync feed clock
      const initialTick: HubWsMessage = {
        type: "TIME_TICK",
        now: Date.now(),
      };
      ws.send(JSON.stringify(initialTick));

      ws.on("message", (raw: string | Buffer) => {
        try {
          const msg = JSON.parse(raw.toString()) as HubWsMessage;

          if (msg.type === "INIT" || msg.type === "CHECK_NEW_LISTINGS") {
            // Client is asking to check for new listings
            const clientKnown = new Set(msg.knownListingIds || []);
            const newItems = latestItems.filter(
              (item) =>
                item &&
                item.id &&
                !clientKnown.has(item.id) &&
                !isTestItem(item),
            );

            if (newItems.length > 0) {
              const reply: HubWsMessage = {
                type: "NEW_LISTINGS",
                items: newItems,
                now: Date.now(),
              };
              ws.send(JSON.stringify(reply));
            } else {
              ws.send(JSON.stringify({ type: "UP_TO_DATE", now: Date.now() }));
            }
          } else if (
            msg.type === "NEW_LISTINGS" &&
            Array.isArray(msg.items) &&
            msg.items.length > 0
          ) {
            // Re-broadcast new listings from a client to all OTHER clients (ignore test listings)
            const validItems = msg.items.filter((item) => !isTestItem(item));
            if (validItems.length === 0) return;

            validItems.forEach((item) => {
              if (item?.id) {
                knownIds.add(item.id);
                if (!latestItems.some((x) => x.id === item.id)) {
                  latestItems.unshift(item);
                }
              }
            });
            // Keep memory bound to 100 items
            if (latestItems.length > 100)
              latestItems = latestItems.slice(0, 100);

            const broadcastPayload = JSON.stringify({
              type: "NEW_LISTINGS",
              items: validItems,
              now: Date.now(),
            });

            for (const client of clients) {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(broadcastPayload);
              }
            }
          }
        } catch {
          // Ignore invalid client message
        }
      });

      ws.on("close", () => {
        clients.delete(ws);
      });

      ws.on("error", () => {
        clients.delete(ws);
      });
    });

    wss.on("error", (err: unknown) => {
      console.warn("[Hub WebSocket] Server error / port conflict:", err);
    });

    // 1. Live Heartbeat / Clock Sync: Broadcast TIME_TICK every 10 seconds
    const intervalId = setInterval(() => {
      if (clients.size === 0) return;
      const tickPayload = JSON.stringify({
        type: "TIME_TICK",
        now: Date.now(),
      });
      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(tickPayload);
        }
      }
    }, 10000);

    // 2. Background Poller: Periodically check /api/hub/home for new listings to broadcast
    const pollIntervalId = setInterval(async () => {
      if (clients.size === 0) return;
      try {
        const appPort = process.env.PORT || 4001;
        const res = await fetch(`http://localhost:${appPort}/api/hub/home`, {
          headers: { "Cache-Control": "no-cache" },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { timeline?: HubTimelineItem[] };
        const timeline = Array.isArray(data?.timeline) ? data.timeline : [];

        if (knownIds.size === 0) {
          // Initial populate
          timeline.forEach((item) => {
            if (item?.id) knownIds.add(item.id);
          });
          latestItems = timeline.slice(0, 50);
          return;
        }

        const freshItems = timeline.filter(
          (item) => item?.id && !knownIds.has(item.id),
        );
        if (freshItems.length > 0) {
          freshItems.forEach((item) => {
            knownIds.add(item.id);
            latestItems.unshift(item);
          });
          if (latestItems.length > 100) latestItems = latestItems.slice(0, 100);

          const payload = JSON.stringify({
            type: "NEW_LISTINGS",
            items: freshItems,
            now: Date.now(),
          });
          for (const client of clients) {
            if (client.readyState === WebSocket.OPEN) {
              client.send(payload);
            }
          }
        }
      } catch {
        // Best-effort internal poll
      }
    }, 15000);

    global.__hubWsServerInstance = {
      wss,
      clients,
      knownIds,
      latestItems,
      intervalId,
      pollIntervalId,
    };

    return {
      port,
      status: "started",
      clientCount: 0,
    };
  } catch (err) {
    console.warn("[Hub WebSocket] Failed to start:", err);
    return {
      port,
      status: "error",
      clientCount: 0,
    };
  }
}

/**
 * Broadcasts a newly published listing to all connected WebSocket clients immediately.
 */
export function broadcastListingToWsClients(
  items: HubTimelineItem | HubTimelineItem[],
): void {
  const instance = global.__hubWsServerInstance;
  if (!instance || instance.clients.size === 0) return;

  const itemArray = (Array.isArray(items) ? items : [items]).filter(
    (item) => !isTestItem(item),
  );
  if (itemArray.length === 0) return;

  itemArray.forEach((item) => {
    if (item?.id) {
      instance.knownIds.add(item.id);
      if (!instance.latestItems.some((x) => x.id === item.id)) {
        instance.latestItems.unshift(item);
      }
    }
  });

  const payload = JSON.stringify({
    type: "NEW_LISTINGS",
    items: itemArray,
    now: Date.now(),
  });

  for (const client of instance.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}
