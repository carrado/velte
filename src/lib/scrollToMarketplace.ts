import type { MouseEvent } from "react";

// Every "Browse the marketplace" CTA uses a clean href="/" — never
// "/#marketplace" — so the address bar never shows a hash at all, not even
// momentarily. The hash was only ever a mechanism for "scroll here once the
// page is ready," and Next's own hash handling turned out to be unreliable
// for exactly that job (confirmed live: clicking Browse from the footer did
// nothing, because the pathname wasn't changing). This does the same job
// without relying on the URL to carry the signal:
//
// - Already on "/": scroll directly, no navigation, no URL change at all.
// - Anywhere else: let Link's normal navigation to "/" happen, but first
//   leave a one-shot sessionStorage flag. MarketplacePreview's own mount
//   effect (see its own comment) consumes that flag and scrolls once the
//   homepage is actually rendered.
export const MARKETPLACE_SCROLL_FLAG = "velte:scroll-to-marketplace";

export function scrollToMarketplace(e: MouseEvent<HTMLAnchorElement>) {
  if (typeof window === "undefined") return;

  if (window.location.pathname === "/") {
    e.preventDefault();
    document
      .getElementById("marketplace")
      ?.scrollIntoView({ behavior: "smooth" });
    return;
  }

  // Best-effort — a buyer in a private-browsing mode where storage is
  // disabled still lands on "/" via Link's normal navigation, just at the
  // top instead of pre-scrolled. Never worth blocking navigation over.
  try {
    sessionStorage.setItem(MARKETPLACE_SCROLL_FLAG, "1");
  } catch {
    // ignore
  }
}
