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

/* "Add Velte to your home screen from your browser menu" tells a buyer
 * nothing actionable — every browser hides that option somewhere
 * different, behind a different icon. This exists for the case
 * beforeinstallprompt never fired (or already fired-and-was-dismissed
 * this session, per spec, and won't refire) even on a browser that
 * genuinely supports installing — the buyer still needs real, specific
 * steps, not a generic "check your menu" shrug. UA sniffing, same
 * heuristic-not-guarantee caveat as isTranssionDevice above.
 *
 * `icon` names which glyph the UI should point at (kept as a plain string
 * here, not a lucide-react import — this module stays UI-framework-
 * agnostic, the caller maps the string to an actual icon component).
 * `noInstallPath` marks the one genuine dead end (Firefox desktop has no
 * install mechanism at all, manual or otherwise) — the UI should offer a
 * different action there (e.g. "copy link, open in Chrome"), not steps
 * that don't exist. */
export interface InstallHint {
  label: string;
  steps: string;
  icon: "share" | "dots" | "lines";
  noInstallPath?: boolean;
}

export function getInstallHint(
  userAgent: string = typeof navigator !== "undefined"
    ? navigator.userAgent
    : "",
): InstallHint {
  const ua = userAgent.toLowerCase();
  const isAndroid = ua.includes("android");
  // Edge and Samsung Internet both include "Chrome" in their UA string —
  // checked first so they aren't misidentified as plain Chrome.
  const isEdge =
    ua.includes("edg/") || ua.includes("edga/") || ua.includes("edgios/");
  const isSamsung = ua.includes("samsungbrowser");
  const isFirefox = ua.includes("firefox") || ua.includes("fxios");
  const isChrome =
    (ua.includes("chrome") || ua.includes("crios")) && !isEdge && !isSamsung;

  if (isSamsung) {
    return {
      label: "Samsung Internet",
      steps: 'Tap "Add page to", then "Home screen".',
      icon: "lines",
    };
  }
  if (isEdge) {
    return {
      label: "Edge",
      steps: isAndroid
        ? 'Tap "Add to phone" or "Install app".'
        : 'Open "Apps", then "Install this site as an app".',
      icon: "dots",
    };
  }
  if (isChrome) {
    return {
      label: "Chrome",
      steps: isAndroid
        ? 'Tap "Install app" or "Add to Home screen".'
        : 'Click the install icon in the address bar, or tap "Install Velte…".',
      icon: "dots",
    };
  }
  if (isFirefox) {
    return isAndroid
      ? { label: "Firefox", steps: 'Tap "Install".', icon: "dots" }
      : {
          label: "Firefox",
          steps:
            "Firefox doesn't support installing apps on desktop — copy the link below and open it in Chrome or Edge instead.",
          icon: "dots",
          noInstallPath: true,
        };
  }
  return {
    label: "your browser",
    steps: 'Look for "Install app" or "Add to Home screen" in the menu.',
    icon: "dots",
  };
}
