"use client";

import type { HubTimelineItem } from "@/types/hub";
import type { AppNotification } from "@/types/notification";
import type { BuyerRequest } from "@/types/buyerRequest";

export interface HubWsClientMessage {
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

type MessageListener = (msg: HubWsClientMessage) => void;
type StatusListener = (connected: boolean, now: number) => void;

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

class SharedWsClient {
  private ws: WebSocket | null = null;
  private isConnecting = false;
  private isConnected = false;
  private now: number = Date.now();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private fallbackTickTimer: ReturnType<typeof setInterval> | null = null;
  private wokenServer = false;

  private messageListeners = new Set<MessageListener>();
  private statusListeners = new Set<StatusListener>();

  // Saved subscription contexts to replay automatically on reconnect
  private userSub: {
    userId: string;
    role?: "vendor" | "buyer";
    knownNotificationIds?: string[];
    knownRequestIds?: string[];
  } | null = null;
  private hubKnownIds: string[] | null = null;

  private notifyStatus() {
    for (const cb of this.statusListeners) {
      cb(this.isConnected, this.now);
    }
  }

  private ensureTimers() {
    if (!this.fallbackTickTimer && typeof window !== "undefined") {
      this.fallbackTickTimer = setInterval(() => {
        if (!this.isConnected) {
          this.now = Date.now();
          this.notifyStatus();
        }
      }, 15000);
    }
  }

  private connect() {
    if (typeof window === "undefined") return;
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }
    if (this.isConnecting) return;

    const wsUrl = getWebSocketUrl();
    if (!wsUrl) return;

    this.ensureTimers();

    if (!this.wokenServer) {
      this.wokenServer = true;
      fetch("/api/hub/ws").catch(() => {});
    }

    try {
      this.isConnecting = true;
      const socket = new WebSocket(wsUrl);
      this.ws = socket;

      socket.onopen = () => {
        this.isConnecting = false;
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.notifyStatus();

        // Replay saved subscriptions on open/reconnect
        if (this.hubKnownIds) {
          this.send({
            type: "INIT",
            knownListingIds: this.hubKnownIds,
          });
        }
        if (this.userSub) {
          this.send({
            type: "SUBSCRIBE_USER",
            ...this.userSub,
          });
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as HubWsClientMessage;
          if (typeof data.now === "number") {
            this.now = data.now;
            this.notifyStatus();
          }
          for (const cb of this.messageListeners) {
            cb(data);
          }
        } catch {
          // ignore malformed messages
        }
      };

      socket.onclose = () => {
        this.isConnecting = false;
        this.isConnected = false;
        this.ws = null;
        this.notifyStatus();

        if (this.messageListeners.size > 0 || this.statusListeners.size > 0) {
          const delay = Math.min(
            1000 * Math.pow(1.5, this.reconnectAttempts),
            8000,
          );
          this.reconnectAttempts += 1;
          if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => this.connect(), delay);
        }
      };

      socket.onerror = () => {
        try {
          socket.close();
        } catch {
          // ignore
        }
      };
    } catch {
      this.isConnecting = false;
    }
  }

  public send(payload: HubWsClientMessage): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(payload));
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  public registerHubInit(knownListingIds: string[]): void {
    const prevKey = (this.hubKnownIds ?? []).join(",");
    const nextKey = knownListingIds.join(",");
    this.hubKnownIds = knownListingIds;
    if (this.isConnected) {
      if (prevKey !== nextKey) {
        this.send({ type: "INIT", knownListingIds });
      }
    } else {
      this.connect();
    }
  }

  public registerUserSubscription(sub: {
    userId: string;
    role?: "vendor" | "buyer";
    knownNotificationIds?: string[];
    knownRequestIds?: string[];
  }): void {
    const prevSerialized = this.userSub ? JSON.stringify(this.userSub) : "";
    this.userSub = {
      ...this.userSub,
      ...sub,
      knownNotificationIds:
        sub.knownNotificationIds ?? this.userSub?.knownNotificationIds,
      knownRequestIds: sub.knownRequestIds ?? this.userSub?.knownRequestIds,
    };
    const nextSerialized = JSON.stringify(this.userSub);

    if (this.isConnected) {
      if (prevSerialized !== nextSerialized) {
        this.send({
          type: "SUBSCRIBE_USER",
          ...this.userSub,
        });
      }
    } else {
      this.connect();
    }
  }

  public subscribe(listener: MessageListener): () => void {
    this.messageListeners.add(listener);
    this.connect();
    return () => {
      this.messageListeners.delete(listener);
    };
  }

  public subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    this.connect();
    listener(this.isConnected, this.now);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public getStatus(): { isConnected: boolean; now: number } {
    return { isConnected: this.isConnected, now: this.now };
  }
}

export const sharedWsClient = new SharedWsClient();
