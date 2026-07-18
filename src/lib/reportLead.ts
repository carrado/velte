// Anonymous, per-browser buyer id — never tied to an account, just enough
// for the backend to recognize "the same buyer clicked again" and apply the
// 15-minute same-buyer/same-vendor cooldown (see velte-backend's chargeLead)
// instead of billing every single click. Persisted in localStorage (not
// sessionStorage) so the cooldown actually holds across tabs/reloads, not
// just within one tab.
const BUYER_ID_KEY = "velte-buyer-id";

function getBuyerId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let id = localStorage.getItem(BUYER_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(BUYER_ID_KEY, id);
    }
    return id;
  } catch {
    // Private browsing/storage disabled — fall through with no id, which
    // just means this click isn't cooldown-deduped, not that it fails.
    return null;
  }
}

// Fires a best-effort "buyer clicked WhatsApp" billing beacon for a search
// result's vendor. Uses sendBeacon (not fetch) so the request is queued by
// the browser and survives the tab switching to WhatsApp immediately after —
// a normal fetch can get cancelled by that navigation before it leaves the
// page. Never awaited and never surfaced to the buyer: this is a side
// effect of the click, not something the WhatsApp handoff depends on.
export function reportLead(vendorId: string, productId?: string) {
  const url = "/api/search/lead";
  const body = JSON.stringify({ vendorId, productId, buyerId: getBuyerId() });

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
