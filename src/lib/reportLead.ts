// Fires a best-effort "buyer clicked WhatsApp" billing beacon for a search
// result's vendor. Uses sendBeacon (not fetch) so the request is queued by
// the browser and survives the tab switching to WhatsApp immediately after —
// a normal fetch can get cancelled by that navigation before it leaves the
// page. Never awaited and never surfaced to the buyer: this is a side
// effect of the click, not something the WhatsApp handoff depends on.
export function reportLead(vendorId: string, productId?: string) {
  const url = "/api/search/lead";
  const body = JSON.stringify({ vendorId, productId });

  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    return;
  }

  // Fallback for the rare browser without sendBeacon — keepalive gives the
  // same "survive navigation" guarantee for a same-origin POST.
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}
