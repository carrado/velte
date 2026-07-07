// Transsion (Tecno/Infinix/itel) phones dominate the Nigerian market and run
// XOS, which aggressively kills backgrounded apps — this silently breaks web
// push (the OS drops the subscription, the next send 410s, we prune it) with
// no error surfaced anywhere the user would see. UA sniffing is the only
// signal available client-side; it's a heuristic, not a guarantee, but these
// brand names reliably show up in the Android WebView UA string.
const TRANSSION_MARKERS = ["tecno", "infinix", "itel", "transsion"];

export function isTranssionDevice(
  userAgent: string = typeof navigator !== "undefined"
    ? navigator.userAgent
    : "",
): boolean {
  const ua = userAgent.toLowerCase();
  return TRANSSION_MARKERS.some((marker) => ua.includes(marker));
}
