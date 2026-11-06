"use client";

import { forwardRef } from "react";
import {
  WifiHigh,
  BatteryFull,
  CellSignalFull,
  Newspaper,
  Path,
  Rss,
} from "@phosphor-icons/react";
import type { IconProps } from "@/types/common";
import { wrapIcon } from "./base";

export const WifiIcon = wrapIcon(WifiHigh, { displayName: "WifiIcon" });
export const BatteryIcon = wrapIcon(BatteryFull, {
  displayName: "BatteryIcon",
});
export const SignalIcon = wrapIcon(CellSignalFull, {
  displayName: "SignalIcon",
});
export const NewspaperIcon = wrapIcon(Newspaper, {
  displayName: "NewspaperIcon",
});
export const RouteIcon = wrapIcon(Path, { displayName: "RouteIcon" });
export const FeedIcon = wrapIcon(Rss, { displayName: "FeedIcon" });

/**
 * Brand mark — Phosphor has no WhatsApp glyph, so this stays a hand SVG.
 * Same IconProps surface as the wrapped set.
 */
export const WhatsAppIcon = forwardRef<SVGSVGElement, IconProps>(
  function WhatsAppIcon(
    { size = 24, strokeWidth: _sw, weight: _w, ...props },
    ref,
  ) {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        aria-hidden="true"
        {...props}
      >
        <g fill="currentColor" fillOpacity={0.32} stroke="none">
          <path d="M12 3.5a8.5 8.5 0 0 0-7.4 12.7L3.5 20.5l4.4-1.1A8.5 8.5 0 1 0 12 3.5Z" />
        </g>
        <g fill="currentColor" stroke="none">
          <path d="M8.7 8.9c.2-.5.5-.5.8-.5h.5c.2 0 .4 0 .5.4.2.5.6 1.5.6 1.6.1.1.1.3 0 .4-.4.6-.8.8-.5 1.3.7 1.2 1.4 1.7 2.5 2.2.2.1.3.1.4-.1l.6-.8c.2-.2.3-.2.5-.1l1.5.7c.2.1.3.1.4.3.1.2.1 1-.2 1.4-.4.4-1.1.8-1.9.7-1.7-.2-3.6-1.1-4.9-2.7-1.1-1.3-1.7-2.6-1.8-3.5-.1-.7.1-1.4.5-1.8Z" />
        </g>
      </svg>
    );
  },
);
WhatsAppIcon.displayName = "WhatsAppIcon";

/**
 * Vendor's Hub / Feed mark — universal feed icon.
 */
export const HubIcon = FeedIcon;
