import { createIcon } from "./base";

export const WalletIcon = createIcon("WalletIcon", {
  base: <rect x="3" y="6" width="18" height="13" rx="3" />,
  accent: (
    <>
      <rect x="5.5" y="8.6" width="8.5" height="2" rx="1" />
      <circle cx="17" cy="13.2" r="1.7" />
    </>
  ),
});

export const CreditCardIcon = createIcon("CreditCardIcon", {
  base: <rect x="2.5" y="5.5" width="19" height="13" rx="2" />,
  accent: (
    <>
      <rect x="2.5" y="9" width="19" height="2.6" />
      <rect x="6" y="14.2" width="5" height="1.6" rx=".8" />
    </>
  ),
});

export const DollarSignIcon = createIcon("DollarSignIcon", {
  accent: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      d="M12 3v18M16.5 7.5c0-1.7-2-3-4.5-3s-4.5 1.2-4.5 3S9 9.7 12 10.3s4.5 1.9 4.5 3.7-2 3-4.5 3-4.5-1.3-4.5-3"
    />
  ),
});

export const TagIcon = createIcon("TagIcon", {
  base: (
    <path d="M12.5 4H6.5A1.5 1.5 0 0 0 5 5.5v6c0 .4.2.8.4 1.1l8 8a1.5 1.5 0 0 0 2.1 0l6-6a1.5 1.5 0 0 0 0-2.1l-8-8A1.5 1.5 0 0 0 12.5 4Z" />
  ),
  accent: <circle cx="9" cy="9" r="1.4" />,
});

export const TagsIcon = createIcon("TagsIcon", {
  base: (
    <path d="M10.5 5H5.5A1.5 1.5 0 0 0 4 6.5v5c0 .4.2.8.4 1.1l6.5 6.5a1.5 1.5 0 0 0 2.1 0l5-5a1.5 1.5 0 0 0 0-2.1L11.6 5.4A1.5 1.5 0 0 0 10.5 5Z" />
  ),
  accent: (
    <>
      <circle cx="7.75" cy="7.75" r="1.3" />
      <path d="M15 5.5l3.6.9c.5.1.9.5 1.1 1l1.3 5.3-1.4 1.4-1-4Z" />
    </>
  ),
});

export const PackageIcon = createIcon("PackageIcon", {
  base: <path d="M4 8.2 12 4l8 4.2v7.6L12 20l-8-4.2Z" />,
  accent: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      d="M4 8.2 12 12l8-3.8M12 12v8"
    />
  ),
});

export const ShoppingCartIcon = createIcon("ShoppingCartIcon", {
  base: (
    <path d="M6.2 8 20 8l-1.6 6.2a1.8 1.8 0 0 1-1.8 1.5H9.4a1.8 1.8 0 0 1-1.8-1.5Z" />
  ),
  accent: (
    <>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        d="M3.5 4h2l1.6 4"
      />
      <circle cx="9.5" cy="20" r="1.3" />
      <circle cx="16.5" cy="20" r="1.3" />
    </>
  ),
});

export const StoreIcon = createIcon("StoreIcon", {
  base: <rect x="5" y="10.8" width="14" height="8.7" rx="1" />,
  accent: (
    <>
      <path d="M4 4.5h16l1.5 5a2.3 2.3 0 0 1-4.4 1 2.3 2.3 0 0 1-4.4 0 2.3 2.3 0 0 1-4.4 0 2.3 2.3 0 0 1-4.4-1Z" />
      <rect x="9.5" y="14" width="5" height="5.5" />
    </>
  ),
});

export const GiftIcon = createIcon("GiftIcon", {
  base: <path d="M5 13.5h14V20H5Z" />,
  accent: (
    <>
      <rect x="3.5" y="9.5" width="17" height="4" rx="1" />
      <rect x="11.2" y="9.5" width="1.6" height="10.5" />
      <path d="M12 9.5C10 9.5 8.5 8.4 8.5 7a2 2 0 0 1 3.6-1.2c.4.5.4 2 0 3.7ZM12 9.5c2 0 3.5-1.1 3.5-2.5A2 2 0 0 0 11.9 5.8c-.4.5-.4 2 0 3.7Z" />
    </>
  ),
});

export const StarIcon = createIcon("StarIcon", {
  accent: (
    <path d="M12 3.5 14.7 9l6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6-4.4-4.2 6-.9Z" />
  ),
});

export const TrendingUpIcon = createIcon("TrendingUpIcon", {
  accent: (
    <>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        d="M3.5 16.5 9.5 10.5 13.5 14.5 20.5 7"
      />
      <path d="M14.2 6.2 21 6l-.3 6.8Z" />
    </>
  ),
});

export const BarChartIcon = createIcon("BarChartIcon", {
  accent: (
    <>
      <rect x="4" y="13" width="4" height="7" rx="1" />
      <rect x="10" y="7" width="4" height="13" rx="1" />
      <rect x="16" y="10" width="4" height="10" rx="1" />
    </>
  ),
});

export const GaugeIcon = createIcon("GaugeIcon", {
  base: <path d="M4 15a8 8 0 1 1 16 0Z" />,
  accent: (
    <>
      <path d="M12 14.5 15.3 10.2 16.6 11.2 13.5 15.6Z" />
      <circle cx="12" cy="14.5" r="1.3" />
    </>
  ),
});

export const TargetIcon = createIcon("TargetIcon", {
  base: <circle cx="12" cy="12" r="8.5" />,
  accent: (
    <>
      <circle
        cx="12"
        cy="12"
        r="5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
      />
      <circle cx="12" cy="12" r="1.6" />
    </>
  ),
});

export const ZapIcon = createIcon("ZapIcon", {
  accent: <path d="M12.5 3 5 13.5h6l-1 7.5L19 10.5h-6Z" />,
});

export const RocketIcon = createIcon("RocketIcon", {
  base: (
    <path d="M13.5 4.5c3 .5 5.5 3 6 6-2.5 1-6.5 4-7.5 7l-4-1.5-1.5-4c3-1 6-5 7-7.5Z" />
  ),
  accent: (
    <>
      <circle cx="14" cy="10" r="1.5" />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        d="M8 15.5 5.5 18M6 12 4 12.8a2 2 0 0 0-1.2 1.7v.3M12 18l-.8 2a2 2 0 0 1-1.7 1.2h-.3"
      />
    </>
  ),
});

export const ScaleIcon = createIcon("ScaleIcon", {
  base: <path d="M6 6.5 3 12a3 3 0 0 0 6 0Zm12 0-3 5.5a3 3 0 0 0 6 0Z" />,
  accent: (
    <>
      <rect x="11.2" y="3.5" width="1.6" height="17" />
      <rect x="8" y="20.3" width="8" height="1.6" rx=".8" />
      <rect x="5.3" y="6" width="6.8" height="1.4" rx=".7" />
      <rect x="12.6" y="6" width="6.8" height="1.4" rx=".7" />
    </>
  ),
});

export const LandmarkIcon = createIcon("LandmarkIcon", {
  base: (
    <>
      <path d="M3.5 9.5 12 4l8.5 5.5Z" />
      <rect x="3" y="19.5" width="18" height="1.6" rx=".8" />
    </>
  ),
  accent: (
    <>
      <rect x="4.3" y="10" width="1.8" height="9" rx=".6" />
      <rect x="8.3" y="10" width="1.8" height="9" rx=".6" />
      <rect x="13.9" y="10" width="1.8" height="9" rx=".6" />
      <rect x="17.9" y="10" width="1.8" height="9" rx=".6" />
    </>
  ),
});

export const LayersIcon = createIcon("LayersIcon", {
  base: (
    <>
      <path d="M3 12l9 4.5 9-4.5-9-4.5Z" />
      <path d="M3 16l9 4.5 9-4.5-2-1-7 3.5-7-3.5Z" />
    </>
  ),
  accent: <path d="M12 3.5 21 8l-9 4.5L3 8Z" />,
});

export const HashIcon = createIcon("HashIcon", {
  accent: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      d="M9 3.5 7 20.5M17 3.5l-2 17M3.5 9h17M3 15h17"
    />
  ),
});
