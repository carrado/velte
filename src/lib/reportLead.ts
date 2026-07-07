// Fires a best-effort "buyer clicked WhatsApp" billing beacon for a search
// result's vendor. Uses sendBeacon (not fetch) so the request is queued by
// the browser and survives the tab switching to WhatsApp immediately after —
// a normal fetch can get cancelled by that navigation before it leaves the
// page. Never awaited and never surfaced to the buyer: this is a side
// effect of the click, not something the WhatsApp handoff depends on.
export function reportLead(vendorId: string, productId?: string) {
  const url = "/api/search/lead";
  const body = JSON.stringify({ vendorId, productId });

  // sendBeacon's return value is whether the browser actually QUEUED the
  // request — found live that it silently returns false (no request ever
  // sent, no error anywhere) when an ad-blocker/privacy extension blocks it,
  // which many do since it's the same API analytics trackers use. A missed
  // return value here means a real lead goes unbilled with zero visibility,
  // so a `false` falls through to the same keepalive-fetch fallback already
  // used for browsers that lack sendBeacon entirely.
  const queued =
    typeof navigator !== "undefined" &&
    !!navigator.sendBeacon &&
    navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
  if (queued) return;

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}
