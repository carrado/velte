import { sharedWsClient } from "@/lib/wsClient";

/**
 * Helper to track Hub advert impressions (views) and click-throughs.
 * - When the Hub WebSocket connection is open, "view" impressions are transmitted
 *   instantly with zero HTTP connection overhead.
 * - "click" events prefer navigator.sendBeacon so outbound navigations (e.g. WhatsApp)
 *   complete without being canceled by page unload.
 * - Automatically falls back to keepalive fetch if WebSocket or beacon is unavailable.
 */
export function trackHubAdvert(
  advertId: string | undefined | null,
  kind: "view" | "click",
): void {
  if (!advertId || typeof window === "undefined") return;

  // 1. Try WebSocket delivery first for views (zero HTTP overhead)
  if (kind === "view") {
    const wsSent = sharedWsClient.send({
      type: "TRACK_ADVERT",
      advertId,
      kind: "view",
    });
    if (wsSent) return;
  }

  const url = `/api/hub/adverts/${encodeURIComponent(advertId)}/track`;
  const body = JSON.stringify({ kind });

  // 2. For clicks, prefer navigator.sendBeacon so navigation isn't blocked / canceled
  if (kind === "click" && typeof navigator.sendBeacon === "function") {
    try {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(url, blob)) return;
    } catch {
      // Fall back to fetch below
    }
  }

  // 3. Keepalive HTTP fetch fallback
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}
