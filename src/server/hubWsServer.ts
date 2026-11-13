import type { IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { backendData, backendFetch } from "@/lib/server/backend";
import type { HubTimelineItem } from "@/types/hub";
import type { AppNotification } from "@/types/notification";
import type { BuyerRequest } from "@/types/buyerRequest";

export interface HubWsMessage {
  type:
    | "TIME_TICK"
    | "NEW_LISTINGS"
    | "INIT"
    | "CHECK_NEW_LISTINGS"
    | "PONG"
    | "UP_TO_DATE"
    | "SUBSCRIBE_USER"
    | "CHECK_NOTIFICATIONS"
    | "NEW_NOTIFICATIONS"
    | "NOTIFICATIONS_SYNC"
    | "CHECK_BUYER_REQUESTS"
    | "NEW_BUYER_REQUESTS"
    | "NEW_BUYER_REQUEST"
    | "BUYER_REQUEST_DECIDED"
    | "BUYER_REQUEST_UPDATED"
    | "LISTING_UPDATED"
    | "LISTING_REMOVED"
    | "HUB_DATA_CHANGED";
  now?: number;
  items?: HubTimelineItem[];
  knownListingIds?: string[];
  productId?: string;
  patch?: Partial<HubTimelineItem>;
  scope?: "adverts" | "boosts" | "community" | "performance" | "all";
  // User / notification / buyer-request fields
  userId?: string;
  role?: "vendor" | "buyer";
  knownNotificationIds?: string[];
  knownRequestIds?: string[];
  notifications?: AppNotification[];
  allNotifications?: AppNotification[];
  unreadCount?: number;
  requests?: BuyerRequest[];
  newRequests?: BuyerRequest[];
  request?: BuyerRequest;
  requestId?: string;
  decision?: string;
}

export interface ClientMeta {
  ws: WebSocket;
  userId?: string;
  role?: "vendor" | "buyer";
  cookie: string;
  knownNotificationIds: Set<string>;
  knownRequestIds: Set<string>;
  knownBuyerResponses: Map<string, number>;
  lastUnreadCount?: number;
  notificationsSeeded: boolean;
  requestsSeeded: boolean;
  buyerRequestsSeeded: boolean;
}

// Global singleton across hot reloads in dev mode
declare global {
  // eslint-disable-next-line no-var
  var __hubWsServerInstance:
    | {
        wss: WebSocketServer;
        clients: Set<WebSocket>;
        clientMetas: Map<WebSocket, ClientMeta>;
        knownIds: Set<string>;
        latestItems: HubTimelineItem[];
        intervalId: NodeJS.Timeout | null;
        pollIntervalId: NodeJS.Timeout | null;
        userSyncIntervalId: NodeJS.Timeout | null;
        onConnectionHandler?: (ws: WebSocket, req: IncomingMessage) => void;
        onUserSyncHandler?: () => Promise<void>;
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

function safeSend(ws: WebSocket, payload: HubWsMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(payload));
    } catch {
      // ignore closed/broken socket send errors
    }
  }
}

function hasVendorCookie(cookie: string): boolean {
  return /\btoken=/.test(cookie);
}

function hasBuyerCookie(cookie: string): boolean {
  return /\bbuyer_token=/.test(cookie);
}

/**
 * Checks backend notifications & buyer-requests for a specific group of sockets
 * sharing the same session cookie.
 */
async function syncSessionForClients(
  cookie: string,
  metas: ClientMeta[],
  opts: { checkNotifications?: boolean; checkRequests?: boolean } = {
    checkNotifications: true,
    checkRequests: true,
  },
): Promise<void> {
  if (!cookie || metas.length === 0) return;

  // 1. Notifications check
  if (opts.checkNotifications) {
    try {
      const body = await backendFetch<{
        notifications?: AppNotification[];
        unreadCount?: number;
      }>("/notifications", { cookie });
      const notifications = Array.isArray(body.notifications)
        ? body.notifications
        : [];
      const unreadCount = body.unreadCount ?? 0;

      for (const meta of metas) {
        if (!meta.userId) continue;

        if (!meta.notificationsSeeded) {
          for (const n of notifications) {
            if (n?.id) meta.knownNotificationIds.add(n.id);
          }
          meta.lastUnreadCount = unreadCount;
          meta.notificationsSeeded = true;
          continue;
        }

        const newNotifications = notifications.filter(
          (n) => n?.id && !meta.knownNotificationIds.has(n.id),
        );
        const unreadChanged =
          meta.lastUnreadCount !== undefined &&
          unreadCount !== meta.lastUnreadCount;

        if (newNotifications.length > 0) {
          for (const n of newNotifications) {
            meta.knownNotificationIds.add(n.id);
          }
          meta.lastUnreadCount = unreadCount;
          safeSend(meta.ws, {
            type: "NEW_NOTIFICATIONS",
            notifications: newNotifications,
            allNotifications: notifications,
            unreadCount,
            now: Date.now(),
          });
        } else if (unreadChanged) {
          meta.lastUnreadCount = unreadCount;
          safeSend(meta.ws, {
            type: "NOTIFICATIONS_SYNC",
            allNotifications: notifications,
            unreadCount,
            now: Date.now(),
          });
        }
      }
    } catch {
      // Best-effort — unauthenticated or transient upstream failure
    }
  }

  // 2. Vendor Buyer Requests check (only when a vendor session cookie exists)
  if (opts.checkRequests && hasVendorCookie(cookie)) {
    const vendorMetas = metas.filter((m) => m.userId && m.role !== "buyer");
    if (vendorMetas.length > 0) {
      try {
        const data = await backendData<{ requests: BuyerRequest[] }>(
          "/vendor/buyer-requests",
          { cookie },
        );
        const requests = Array.isArray(data?.requests) ? data.requests : [];

        for (const meta of vendorMetas) {
          if (!meta.requestsSeeded) {
            for (const r of requests) {
              if (r?.id) meta.knownRequestIds.add(r.id);
            }
            meta.requestsSeeded = true;
            continue;
          }

          const newRequests = requests.filter(
            (r) => r?.id && !meta.knownRequestIds.has(r.id),
          );
          if (newRequests.length > 0) {
            for (const r of newRequests) {
              meta.knownRequestIds.add(r.id);
            }
            safeSend(meta.ws, {
              type: "NEW_BUYER_REQUESTS",
              newRequests,
              requests,
              now: Date.now(),
            });
          }
        }
      } catch {
        // Best-effort
      }
    }
  }

  // 3. Buyer's Own Requests check (detects when a vendor responds/quotes on a buyer's request)
  if (
    opts.checkRequests &&
    (hasBuyerCookie(cookie) || metas.some((m) => m.role === "buyer"))
  ) {
    const buyerMetas = metas.filter((m) => m.userId);
    if (buyerMetas.length > 0) {
      try {
        const data = await backendData<{ requests: BuyerRequest[] }>(
          "/buyer-requests/mine",
          { cookie },
        );
        const requests = Array.isArray(data?.requests) ? data.requests : [];

        for (const meta of buyerMetas) {
          if (!meta.buyerRequestsSeeded) {
            for (const r of requests) {
              if (r?.id) {
                const count =
                  (r as { acceptedCount?: number; responses?: unknown[] })
                    .acceptedCount ??
                  (r as { responses?: unknown[] }).responses?.length ??
                  0;
                meta.knownBuyerResponses.set(r.id, count);
              }
            }
            meta.buyerRequestsSeeded = true;
            continue;
          }

          let hasUpdate = false;
          for (const r of requests) {
            if (!r?.id) continue;
            const count =
              (r as { acceptedCount?: number; responses?: unknown[] })
                .acceptedCount ??
              (r as { responses?: unknown[] }).responses?.length ??
              0;
            const prev = meta.knownBuyerResponses.get(r.id);
            if (prev === undefined || count > prev) {
              meta.knownBuyerResponses.set(r.id, count);
              hasUpdate = true;
            }
          }

          if (hasUpdate) {
            safeSend(meta.ws, {
              type: "BUYER_REQUEST_UPDATED",
              requests,
              now: Date.now(),
            });
          }
        }
      } catch {
        // Best-effort
      }
    }
  }
}

async function runAllUserSyncs(): Promise<void> {
  const instance = global.__hubWsServerInstance;
  if (!instance || instance.clientMetas.size === 0) return;

  // Group sockets by session cookie so we only make 1 backend request per unique user session
  const byCookie = new Map<string, ClientMeta[]>();
  for (const meta of instance.clientMetas.values()) {
    if (!meta.cookie || !meta.userId) continue;
    const list = byCookie.get(meta.cookie) || [];
    list.push(meta);
    byCookie.set(meta.cookie, list);
  }

  await Promise.allSettled(
    Array.from(byCookie.entries()).map(([cookie, metas]) =>
      syncSessionForClients(cookie, metas),
    ),
  );
}

const PROD_WS_HOSTNAMES = new Set([
  "velte.ng",
  "www.velte.ng",
  "velte-dev.vercel.app",
]);

const DEV_WS_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

function isAllowedWsOrigin(
  origin: string | undefined,
  hostHeader: string | undefined,
): boolean {
  const isProd = process.env.NODE_ENV === "production";

  // Reject browsers sending cookies without an Origin header in production
  if (!origin) {
    return !isProd;
  }

  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();
    if (PROD_WS_HOSTNAMES.has(hostname)) {
      return true;
    }

    if (!isProd && DEV_WS_HOSTNAMES.has(hostname)) {
      return true;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.FRONTEND_URL;
    if (appUrl) {
      try {
        if (new URL(appUrl).hostname.toLowerCase() === hostname) {
          return true;
        }
      } catch {
        // ignore invalid env URL
      }
    }

    // Same-hostname check against the server's Host header
    if (hostHeader) {
      const serverHostname = hostHeader.split(":")[0]?.toLowerCase();
      if (serverHostname && hostname === serverHostname) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

function handleConnection(ws: WebSocket, req: IncomingMessage): void {
  const instance = global.__hubWsServerInstance;
  if (!instance) return;

  // CSWSH protection: reject WebSocket handshakes from untrusted origins
  const origin = req.headers.origin;
  if (!isAllowedWsOrigin(origin, req.headers.host)) {
    ws.close(1008, "Forbidden origin");
    return;
  }

  const { clients, clientMetas, knownIds } = instance;
  const cookie = req.headers.cookie || "";

  clients.add(ws);
  const meta: ClientMeta = {
    ws,
    cookie,
    knownNotificationIds: new Set(),
    knownRequestIds: new Set(),
    knownBuyerResponses: new Map(),
    notificationsSeeded: false,
    requestsSeeded: false,
    buyerRequestsSeeded: false,
  };
  clientMetas.set(ws, meta);

  // Immediately send current timestamp to sync feed clock
  safeSend(ws, {
    type: "TIME_TICK",
    now: Date.now(),
  });

  ws.on("message", (raw: string | Buffer) => {
    try {
      const msg = JSON.parse(raw.toString()) as HubWsMessage;
      const currentInstance = global.__hubWsServerInstance;
      if (!currentInstance) return;

      if (msg.type === "INIT" || msg.type === "CHECK_NEW_LISTINGS") {
        const clientKnown = new Set(msg.knownListingIds || []);
        const newItems = currentInstance.latestItems.filter(
          (item) =>
            item && item.id && !clientKnown.has(item.id) && !isTestItem(item),
        );

        if (newItems.length > 0) {
          safeSend(ws, {
            type: "NEW_LISTINGS",
            items: newItems,
            now: Date.now(),
          });
        } else {
          safeSend(ws, { type: "UP_TO_DATE", now: Date.now() });
        }
      } else if (
        msg.type === "NEW_LISTINGS" &&
        Array.isArray(msg.items) &&
        msg.items.length > 0
      ) {
        const validItems = msg.items.filter((item) => !isTestItem(item));
        if (validItems.length === 0) return;

        validItems.forEach((item) => {
          if (item?.id) {
            knownIds.add(item.id);
            if (!currentInstance.latestItems.some((x) => x.id === item.id)) {
              currentInstance.latestItems.unshift(item);
            }
          }
        });
        if (currentInstance.latestItems.length > 100) {
          currentInstance.latestItems = currentInstance.latestItems.slice(
            0,
            100,
          );
        }

        const payload: HubWsMessage = {
          type: "NEW_LISTINGS",
          items: validItems,
          now: Date.now(),
        };
        for (const client of clients) {
          if (client !== ws) {
            safeSend(client, payload);
          }
        }
      } else if (msg.type === "SUBSCRIBE_USER") {
        if (msg.userId) meta.userId = msg.userId;
        if (msg.role) meta.role = msg.role;

        if (Array.isArray(msg.knownNotificationIds)) {
          for (const id of msg.knownNotificationIds) {
            meta.knownNotificationIds.add(id);
          }
          if (msg.knownNotificationIds.length > 0) {
            meta.notificationsSeeded = true;
          }
        }

        if (Array.isArray(msg.knownRequestIds)) {
          for (const id of msg.knownRequestIds) {
            meta.knownRequestIds.add(id);
          }
          if (msg.knownRequestIds.length > 0) {
            meta.requestsSeeded = true;
          }
        }

        // Just register subscription state in memory — do NOT hit backend on every subscribe
        // (initial data is already loaded by the client's React Query hooks).
      } else if (msg.type === "CHECK_NOTIFICATIONS") {
        if (Array.isArray(msg.knownNotificationIds)) {
          for (const id of msg.knownNotificationIds) {
            meta.knownNotificationIds.add(id);
          }
          meta.notificationsSeeded = true;
        }
        if (meta.cookie && meta.userId) {
          void syncSessionForClients(meta.cookie, [meta], {
            checkNotifications: true,
            checkRequests: false,
          });
        }
      } else if (msg.type === "CHECK_BUYER_REQUESTS") {
        if (Array.isArray(msg.knownRequestIds)) {
          for (const id of msg.knownRequestIds) {
            meta.knownRequestIds.add(id);
          }
          meta.requestsSeeded = true;
        }
        if (meta.cookie && meta.userId) {
          void syncSessionForClients(meta.cookie, [meta], {
            checkNotifications: false,
            checkRequests: true,
          });
        }
      }
    } catch {
      // Ignore invalid client message
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    clientMetas.delete(ws);
  });

  ws.on("error", () => {
    clients.delete(ws);
    clientMetas.delete(ws);
  });
}

export function startHubWsServer(): {
  port: number;
  status: "already_running" | "started" | "error";
  clientCount: number;
} {
  const port = getWsPort();

  if (global.__hubWsServerInstance) {
    // Hot-swap handlers so dev HMR updates apply to the existing singleton server immediately
    global.__hubWsServerInstance.onConnectionHandler = handleConnection;
    global.__hubWsServerInstance.onUserSyncHandler = runAllUserSyncs;
    // Clear any legacy polling intervals to prevent backend 429 rate-limit exhaustion
    if (global.__hubWsServerInstance.pollIntervalId) {
      clearInterval(global.__hubWsServerInstance.pollIntervalId);
      global.__hubWsServerInstance.pollIntervalId = null;
    }
    if (global.__hubWsServerInstance.userSyncIntervalId) {
      clearInterval(global.__hubWsServerInstance.userSyncIntervalId);
      global.__hubWsServerInstance.userSyncIntervalId = null;
    }
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
    const clientMetas = new Map<WebSocket, ClientMeta>();
    const knownIds = new Set<string>();
    const latestItems: HubTimelineItem[] = [];

    global.__hubWsServerInstance = {
      wss,
      clients,
      clientMetas,
      knownIds,
      latestItems,
      intervalId: null,
      pollIntervalId: null,
      userSyncIntervalId: null,
      onConnectionHandler: handleConnection,
      onUserSyncHandler: runAllUserSyncs,
    };

    wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
      global.__hubWsServerInstance?.onConnectionHandler?.(ws, req);
    });

    wss.on("error", (err: unknown) => {
      console.warn("[Hub WebSocket] Server error / port conflict:", err);
    });

    // 1. Live Heartbeat / Clock Sync: Broadcast TIME_TICK every 10 seconds
    const intervalId = setInterval(() => {
      const instance = global.__hubWsServerInstance;
      if (!instance || instance.clients.size === 0) return;
      const tickPayload: HubWsMessage = {
        type: "TIME_TICK",
        now: Date.now(),
      };
      for (const client of instance.clients) {
        safeSend(client, tickPayload);
      }
    }, 10000);

    global.__hubWsServerInstance.intervalId = intervalId;
    global.__hubWsServerInstance.pollIntervalId = null;
    global.__hubWsServerInstance.userSyncIntervalId = null;

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

  const payload: HubWsMessage = {
    type: "NEW_LISTINGS",
    items: itemArray,
    now: Date.now(),
  };

  for (const client of instance.clients) {
    safeSend(client, payload);
  }
}

/**
 * Sends a message to all WebSocket connections belonging to a specific userId.
 */
export function broadcastToUser(userId: string, msg: HubWsMessage): void {
  const instance = global.__hubWsServerInstance;
  if (!instance) return;

  for (const meta of instance.clientMetas.values()) {
    if (meta.userId === userId) {
      safeSend(meta.ws, { ...msg, now: Date.now() });
    }
  }
}

/**
 * Triggers an immediate sync check across all connected vendor/user sessions
 * (e.g., right after a buyer request is created so matched vendors get notified immediately).
 */
export async function triggerImmediateUserSync(opts?: {
  userId?: string;
  checkNotifications?: boolean;
  checkRequests?: boolean;
}): Promise<void> {
  const instance = global.__hubWsServerInstance;
  if (!instance || instance.clientMetas.size === 0) return;

  const byCookie = new Map<string, ClientMeta[]>();
  for (const meta of instance.clientMetas.values()) {
    if (!meta.cookie || !meta.userId) continue;
    if (opts?.userId && meta.userId !== opts.userId) continue;
    const list = byCookie.get(meta.cookie) || [];
    list.push(meta);
    byCookie.set(meta.cookie, list);
  }

  await Promise.allSettled(
    Array.from(byCookie.entries()).map(([cookie, metas]) =>
      syncSessionForClients(cookie, metas, {
        checkNotifications: opts?.checkNotifications ?? true,
        checkRequests: opts?.checkRequests ?? true,
      }),
    ),
  );
}

/**
 * Broadcasts a Hub data update (listing edited/removed, advert/boost/community change)
 * to all connected WebSocket clients immediately without polling.
 */
export function broadcastHubEvent(msg: HubWsMessage): void {
  const instance = global.__hubWsServerInstance;
  if (!instance || instance.clients.size === 0) return;

  const payload: HubWsMessage = { ...msg, now: Date.now() };
  for (const client of instance.clients) {
    safeSend(client, payload);
  }
}
