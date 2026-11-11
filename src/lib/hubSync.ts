import type { HubTimelineItem } from "@/types/hub";
import type { CategoryProduct } from "@/types/product";

const HUB_BROADCAST_CHANNEL = "hub-listings-sync";

type HubSyncMessage =
  | { type: "HUB_NEW_LISTING"; item: HubTimelineItem }
  | { type: "HUB_NEW_LISTINGS"; items: HubTimelineItem[] };

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

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (
    typeof window === "undefined" ||
    typeof BroadcastChannel === "undefined"
  ) {
    return null;
  }
  if (!channel) {
    try {
      channel = new BroadcastChannel(HUB_BROADCAST_CHANNEL);
    } catch {
      return null;
    }
  }
  return channel;
}

/**
 * Broadcasts a newly added listing to all other open tabs/windows and WebSocket clients.
 */
export function broadcastHubNewListing(item: HubTimelineItem): void {
  try {
    const ch = getChannel();
    ch?.postMessage({ type: "HUB_NEW_LISTING", item });
  } catch {
    // broadcast best-effort
  }

  if (typeof window !== "undefined") {
    fetch("/api/hub/ws", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item }),
    }).catch(() => {
      // best-effort
    });
  }
}

/**
 * Broadcasts multiple newly added listings to all other open tabs/windows and WebSocket clients.
 */
export function broadcastHubNewListings(items: HubTimelineItem[]): void {
  try {
    const ch = getChannel();
    ch?.postMessage({ type: "HUB_NEW_LISTINGS", items });
  } catch {
    // broadcast best-effort
  }

  if (typeof window !== "undefined") {
    fetch("/api/hub/ws", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    }).catch(() => {
      // best-effort
    });
  }
}

/**
 * Synchronizes the list of known listing IDs with the Service Worker background thread.
 */
export function syncHubKnownListingIds(ids: string[]): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "HUB_SYNC_KNOWN_IDS",
        ids,
      });
    }
  } catch {
    // best-effort
  }
}

/**
 * Prompts the Service Worker to perform a background check for new listings.
 */
export function triggerHubBackgroundCheck(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "HUB_TRIGGER_CHECK",
      });
    }
  } catch {
    // best-effort
  }
}

/**
 * Subscribes to background updates from BroadcastChannel and Service Worker postMessage.
 */
export function subscribeToHubNewListings(
  callback: (newItems: HubTimelineItem[]) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  // 1. Listen via BroadcastChannel (tab-to-tab instant notification)
  const ch = getChannel();
  const handleChannelMessage = (event: MessageEvent<HubSyncMessage>) => {
    if (!event.data) return;
    if (
      event.data.type === "HUB_NEW_LISTING" &&
      event.data.item &&
      !isTestItem(event.data.item)
    ) {
      callback([event.data.item]);
    } else if (
      event.data.type === "HUB_NEW_LISTINGS" &&
      Array.isArray(event.data.items) &&
      event.data.items.length > 0
    ) {
      const valid = event.data.items.filter((x) => !isTestItem(x));
      if (valid.length > 0) callback(valid);
    }
  };
  ch?.addEventListener("message", handleChannelMessage);

  // 2. Listen via ServiceWorker (background poller that runs out of page fetch view)
  const handleSwMessage = (event: MessageEvent) => {
    if (!event.data) return;
    if (
      event.data.type === "HUB_NEW_LISTINGS" &&
      Array.isArray(event.data.items) &&
      event.data.items.length > 0
    ) {
      const valid = event.data.items.filter(
        (x: HubTimelineItem) => !isTestItem(x),
      );
      if (valid.length > 0) callback(valid);
    }
  };
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", handleSwMessage);
  }

  return () => {
    ch?.removeEventListener("message", handleChannelMessage);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.removeEventListener("message", handleSwMessage);
    }
  };
}

/**
 * Converts a newly created CategoryProduct into a HubTimelineItem.
 */
export function productToHubTimelineItem(
  product: CategoryProduct,
  vendorInfo?: {
    storeName?: string;
    storeHandle?: string;
    avatar?: string;
    verified?: boolean;
    vendorId?: string;
  },
): HubTimelineItem {
  const vendorId =
    (product as { vendorId?: string }).vendorId || vendorInfo?.vendorId || "";
  const sectors = product.sectorValue
    ? [product.sectorValue]
    : product.categoryId
      ? [product.categoryId]
      : [];

  return {
    id: `prod_${product.id}`,
    vendorId,
    kind: "product",
    at: product.createdDate || new Date().toISOString(),
    title: product.name,
    body: product.description || null,
    imageUrl: product.mainImageUrl || null,
    storeName: vendorInfo?.storeName ?? null,
    storeHandle: vendorInfo?.storeHandle ?? null,
    avatar: vendorInfo?.avatar ?? null,
    verified: Boolean(vendorInfo?.verified),
    sponsored: false,
    sectors,
    place: null,
    images: product.mainImageUrl ? [product.mainImageUrl] : [],
    ratingAvg: null,
    ratingCount: 0,
    whatsapp: null,
    social: null,
    fastDelivery: false,
    favourite: false,
    trusted: false,
    sentiment: null,
    reviewableOrderId: null,
    listing: {
      productId: product.id,
      name: product.name,
      kind: product.kind === "service" ? "service" : "product",
      price: Math.round((product.price || 0) * 100),
      priceMax: product.priceMax ? Math.round(product.priceMax * 100) : null,
      currency: product.currency || "NGN",
      quoteOnRequest: Boolean(product.quoteOnRequest),
      description: product.description || null,
      images: product.mainImageUrl ? [product.mainImageUrl] : [],
      attributes: [],
      checkoutEligible: true,
    },
  };
}
