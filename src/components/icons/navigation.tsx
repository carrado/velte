import { createIcon } from "./base";

const arrowUpShape =
  "M12 4 5.5 10.5 9.5 10.5 9.5 20 14.5 20 14.5 10.5 18.5 10.5Z";

export const ArrowLeftIcon = createIcon("ArrowLeftIcon", {
  accent: <path d="M14 5.5 6.5 12 14 18.5 14 14.5 20 14.5 20 9.5 14 9.5Z" />,
});

export const ArrowRightIcon = createIcon("ArrowRightIcon", {
  accent: <path d="M10 5.5 17.5 12 10 18.5 10 14.5 4 14.5 4 9.5 10 9.5Z" />,
});

export const ArrowUpIcon = createIcon("ArrowUpIcon", {
  accent: <path d={arrowUpShape} />,
});

export const ArrowUpRightIcon = createIcon("ArrowUpRightIcon", {
  accent: (
    <g transform="rotate(45 12 12)">
      <path d={arrowUpShape} />
    </g>
  ),
});

export const ArrowDownLeftIcon = createIcon("ArrowDownLeftIcon", {
  accent: (
    <g transform="rotate(225 12 12)">
      <path d={arrowUpShape} />
    </g>
  ),
});

export const ArrowUpDownIcon = createIcon("ArrowUpDownIcon", {
  accent: (
    <>
      <path d="M8.5 19V7.5M5 9.5 8.5 5 12 9.5Z" />
      <path d="M15.5 5v11.5M12 14.5 15.5 19 19 14.5Z" />
    </>
  ),
});

export const ChevronLeftIcon = createIcon("ChevronLeftIcon", {
  accent: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      d="M14.5 5 8 12l6.5 7"
    />
  ),
});

export const ChevronRightIcon = createIcon("ChevronRightIcon", {
  accent: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      d="M9.5 5 16 12l-6.5 7"
    />
  ),
});

export const ChevronUpIcon = createIcon("ChevronUpIcon", {
  accent: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      d="M5 14.5 12 8l7 6.5"
    />
  ),
});

export const ChevronDownIcon = createIcon("ChevronDownIcon", {
  accent: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      d="M5 9.5 12 16l7-6.5"
    />
  ),
});

export const ExternalLinkIcon = createIcon("ExternalLinkIcon", {
  base: <rect x="4" y="6" width="13" height="13" rx="2.5" />,
  accent: <path d="M11 4h9v9h-2.3V7.7L10.6 15 9 13.4l7.3-7.3H11Z" />,
});

export const CompassIcon = createIcon("CompassIcon", {
  base: <circle cx="12" cy="12" r="9" />,
  accent: <path d="M15.3 8.7 13.6 13.6 8.7 15.3 10.4 10.4Z" />,
});

export const LocateFixedIcon = createIcon("LocateFixedIcon", {
  base: <circle cx="12" cy="12" r="7" />,
  accent: (
    <>
      <circle cx="12" cy="12" r="2.6" />
      <rect x="11.15" y="1.3" width="1.7" height="3.4" rx=".85" />
      <rect x="11.15" y="19.3" width="1.7" height="3.4" rx=".85" />
      <rect x="1.3" y="11.15" width="3.4" height="1.7" rx=".85" />
      <rect x="19.3" y="11.15" width="3.4" height="1.7" rx=".85" />
    </>
  ),
});

export const MapPinIcon = createIcon("MapPinIcon", {
  base: <path d="M19 10.5c0 5.5-7 11-7 11s-7-5.5-7-11a7 7 0 0 1 14 0Z" />,
  accent: <circle cx="12" cy="10.5" r="2.6" />,
});

export const LinkIcon = createIcon("LinkIcon", {
  accent: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      d="M10 14a4.5 4.5 0 0 0 6.4.3l2-2a4.5 4.5 0 0 0-6.36-6.37l-1.3 1.28M14 10a4.5 4.5 0 0 0-6.4-.3l-2 2a4.5 4.5 0 0 0 6.36 6.37l1.28-1.27"
    />
  ),
});

export const GlobeIcon = createIcon("GlobeIcon", {
  base: <circle cx="12" cy="12" r="9" />,
  accent: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      d="M3 12h18M12 3c2.5 2.6 3.8 5.8 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.8-3.8-9s1.3-6.4 3.8-9Z"
    />
  ),
});

export const MenuIcon = createIcon("MenuIcon", {
  accent: (
    <>
      <rect x="4" y="5.8" width="16" height="2.4" rx="1.2" />
      <rect x="4" y="10.8" width="16" height="2.4" rx="1.2" />
      <rect x="4" y="15.8" width="16" height="2.4" rx="1.2" />
    </>
  ),
});

export const MoreHorizontalIcon = createIcon("MoreHorizontalIcon", {
  accent: (
    <>
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </>
  ),
});

export const MoreVerticalIcon = createIcon("MoreVerticalIcon", {
  accent: (
    <>
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
    </>
  ),
});
