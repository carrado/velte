// crypto.randomUUID() needs both a secure context AND a fairly recent
// browser/WebView (Chrome 92+, Safari 15.4+) — missing entirely on a real
// slice of the budget-Android audience this site targets (older system
// WebViews, in-app browsers embedded in WhatsApp/Facebook/Instagram; same
// class of "older WebView" gap as [[push_410_transsion_devices]]). Calling
// it directly there throws `crypto.randomUUID is not a function` and takes
// down whatever called it — this is what broke /chat's very first message
// on mobile (2026-08-18).
//
// Falls back to crypto.getRandomValues() (real RFC 4122 v4 UUID, much
// broader support) and only drops to Math.random() if even that's
// missing. Fine for every current call site (a turn id, an anonymous
// per-browser buyer id) — they just need uniqueness, never
// unpredictability, so a non-cryptographic last resort is an acceptable
// trade for not crashing.
export function generateUUID(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
      "",
    );
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
