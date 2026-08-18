import { createIcon } from "./base";

const shieldShape = "M12 3.5 19 6v6c0 4.5-3 7.5-7 8.5-4-1-7-4-7-8.5V6Z";

export const AlertCircleIcon = createIcon("AlertCircleIcon", {
  base: <circle cx="12" cy="12" r="9" />,
  accent: (
    <>
      <rect x="11" y="6.5" width="2" height="7" rx="1" />
      <circle cx="12" cy="16.75" r="1.2" />
    </>
  ),
});

export const AlertTriangleIcon = createIcon("AlertTriangleIcon", {
  base: <path d="M12 4 21.5 20h-19Z" />,
  accent: (
    <>
      <rect x="11" y="9.5" width="2" height="5.5" rx="1" />
      <circle cx="12" cy="17.25" r="1.1" />
    </>
  ),
});

export const CheckCircleIcon = createIcon("CheckCircleIcon", {
  base: <circle cx="12" cy="12" r="9" />,
  accent: <path d="M10.3 15.6 7 12.3l1.4-1.4 1.9 1.9 5-5 1.4 1.4Z" />,
});

export const XCircleIcon = createIcon("XCircleIcon", {
  base: <circle cx="12" cy="12" r="9" />,
  accent: (
    <>
      <rect
        x="11.1"
        y="7.5"
        width="1.8"
        height="9"
        rx=".9"
        transform="rotate(45 12 12)"
      />
      <rect
        x="11.1"
        y="7.5"
        width="1.8"
        height="9"
        rx=".9"
        transform="rotate(-45 12 12)"
      />
    </>
  ),
});

export const InfoIcon = createIcon("InfoIcon", {
  base: <circle cx="12" cy="12" r="9" />,
  accent: (
    <>
      <rect x="11" y="10.5" width="2" height="6" rx="1" />
      <circle cx="12" cy="7.75" r="1.2" />
    </>
  ),
});

export const HelpCircleIcon = createIcon("HelpCircleIcon", {
  base: <circle cx="12" cy="12" r="9" />,
  accent: (
    <>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        d="M9.3 9.8a2.7 2.7 0 1 1 4 2.3c-.9.5-1.3 1-1.3 2"
      />
      <circle cx="12" cy="16.75" r="1.2" />
    </>
  ),
});

export const ShieldIcon = createIcon("ShieldIcon", {
  accent: <path d={shieldShape} />,
});

export const ShieldCheckIcon = createIcon("ShieldCheckIcon", {
  base: <path d={shieldShape} />,
  accent: <path d="M10.6 13.9 8.3 11.6l1.3-1.3 1 1 3.5-3.5 1.3 1.3Z" />,
});

export const ShieldAlertIcon = createIcon("ShieldAlertIcon", {
  base: <path d={shieldShape} />,
  accent: (
    <>
      <rect x="11.1" y="7.8" width="1.8" height="5" rx=".9" />
      <circle cx="12" cy="15.3" r="1.1" />
    </>
  ),
});

export const BadgeCheckIcon = createIcon("BadgeCheckIcon", {
  base: (
    <path d="M12 3.5 14.2 5h2.8l1 2.6L20.5 9l-1.2 2.5L20.5 14l-2.5 1.4-1 2.6h-2.8L12 19.5l-2.2-1.5H7l-1-2.6L3.5 14l1.2-2.5L3.5 9l2.5-1.4 1-2.6h2.8Z" />
  ),
  accent: <path d="M10.3 14.4 8 12.1l1.3-1.3 1 1 3.6-3.6 1.3 1.3Z" />,
});

export const BanIcon = createIcon("BanIcon", {
  base: <circle cx="12" cy="12" r="9" />,
  accent: (
    <rect
      x="11"
      y="4.5"
      width="2"
      height="15"
      rx="1"
      transform="rotate(45 12 12)"
    />
  ),
});

export const PlayCircleIcon = createIcon("PlayCircleIcon", {
  base: <circle cx="12" cy="12" r="9" />,
  accent: <path d="M10 8.3l6.5 3.7-6.5 3.7Z" />,
});

export const WifiOffIcon = createIcon("WifiOffIcon", {
  accent: (
    <>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        d="M8.5 8.7a10 10 0 0 1 10.9 2M5.3 11.3A9.9 9.9 0 0 1 8 9.3M2 8.3a13.9 13.9 0 0 1 3.5-2.6M12 15.8a4 4 0 0 1 3.9 1M8 15.7a4 4 0 0 1 1.6-1.4"
      />
      <circle cx="12" cy="19.2" r="1.2" />
      <rect
        x="11"
        y="2"
        width="2"
        height="22"
        rx="1"
        transform="rotate(45 12 12)"
      />
    </>
  ),
});

export const ServerCrashIcon = createIcon("ServerCrashIcon", {
  base: (
    <>
      <rect x="3.5" y="4" width="17" height="6.5" rx="1.5" />
      <rect x="3.5" y="13.5" width="17" height="6.5" rx="1.5" />
    </>
  ),
  accent: (
    <>
      <circle cx="7" cy="7.2" r="1" />
      <path d="M14.5 12.2 12 15.7l2.4.7-1.9 3.8 4.5-4.7-2.6-.8Z" />
    </>
  ),
});

export const BatteryWarningIcon = createIcon("BatteryWarningIcon", {
  base: <rect x="2.5" y="8" width="16" height="9" rx="2" />,
  accent: (
    <>
      <rect x="20.5" y="10.3" width="2" height="4.4" rx="1" />
      <rect x="9.2" y="10" width="1.8" height="3.6" rx=".9" />
      <circle cx="10" cy="15" r="1" />
    </>
  ),
});

export const LoaderIcon = createIcon("LoaderIcon", {
  accent: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      d="M12 3a9 9 0 1 1 9 9"
      opacity="0.9"
    />
  ),
});
