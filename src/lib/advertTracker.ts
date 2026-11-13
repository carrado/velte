/**
 * Helper to track Hub advert impressions (views) and click-throughs.
 * Uses navigator.sendBeacon when available so clicks complete navigation
 * without waiting on an HTTP round trip.
 */
export function trackHubAdvert(
  advertId: string | undefined | null,
  kind: "view" | "click",
): void {
  if (!advertId || typeof window === "undefined") return;

  const url = `/api/hub/adverts/${advertId}/track`;
  const body = JSON.stringify({ kind });

  if (kind === "click" && typeof navigator.sendBeacon === "function") {
    try {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(url, blob)) return;
    } catch {
      // Fall back to fetch below
    }
  }

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}
