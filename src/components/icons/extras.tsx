import { createIcon } from "./base";

/** Icons needed once the landing pages' short-lived Phosphor experiment
 *  (2026-08-16) got folded into this set too — see [[custom_icon_system]]. */

export const WifiIcon = createIcon("WifiIcon", {
  accent: (
    <>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        d="M4.5 9.5a11 11 0 0 1 15 0M7.3 12.7a7 7 0 0 1 9.4 0M10.1 15.9a3 3 0 0 1 3.8 0"
      />
      <circle cx="12" cy="19" r="1.2" />
    </>
  ),
});

export const BatteryIcon = createIcon("BatteryIcon", {
  base: <rect x="2.5" y="8" width="16" height="9" rx="2" />,
  accent: (
    <>
      <rect x="20.5" y="11" width="2" height="3" rx="1" />
      <rect x="4.5" y="10" width="12" height="5" rx="1" />
    </>
  ),
});

export const SignalIcon = createIcon("SignalIcon", {
  accent: (
    <>
      <rect x="4" y="16" width="3" height="4" rx="1" />
      <rect x="9.5" y="12" width="3" height="8" rx="1" />
      <rect x="15" y="7" width="3" height="13" rx="1" />
      <rect x="20.5" y="3" width="2" height="17" rx="1" />
    </>
  ),
});

export const NewspaperIcon = createIcon("NewspaperIcon", {
  base: (
    <path d="M4.5 6.5h11a1.5 1.5 0 0 1 1.5 1.5v10.5H6a1.5 1.5 0 0 1-1.5-1.5Z" />
  ),
  accent: (
    <>
      <path d="M17 9.5h1.5A1.5 1.5 0 0 1 20 11v7.5a1.5 1.5 0 0 1-1.5 1.5H17Z" />
      <rect x="7.5" y="9.5" width="5" height="5" rx=".5" />
      <rect x="7.5" y="15.5" width="9" height="1.4" rx=".7" />
    </>
  ),
});

export const RouteIcon = createIcon("RouteIcon", {
  accent: (
    <>
      <circle cx="5.5" cy="18.5" r="2.3" />
      <circle cx="18.5" cy="5.5" r="2.3" />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeDasharray="1 3.3"
        d="M7.5 18.5H15a3.5 3.5 0 0 0 3.5-3.5V9.5"
      />
    </>
  ),
});

export const WhatsAppIcon = createIcon("WhatsAppIcon", {
  base: (
    <path d="M12 3.5a8.5 8.5 0 0 0-7.4 12.7L3.5 20.5l4.4-1.1A8.5 8.5 0 1 0 12 3.5Z" />
  ),
  accent: (
    <path d="M8.7 8.9c.2-.5.5-.5.8-.5h.5c.2 0 .4 0 .5.4.2.5.6 1.5.6 1.6.1.1.1.3 0 .4-.4.6-.8.8-.5 1.3.7 1.2 1.4 1.7 2.5 2.2.2.1.3.1.4-.1l.6-.8c.2-.2.3-.2.5-.1l1.5.7c.2.1.3.1.4.3.1.2.1 1-.2 1.4-.4.4-1.1.8-1.9.7-1.7-.2-3.6-1.1-4.9-2.7-1.1-1.3-1.7-2.6-1.8-3.5-.1-.7.1-1.4.5-1.8Z" />
  ),
});
