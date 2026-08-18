import { forwardRef, type ReactNode } from "react";
import type { IconProps } from "@/types/common";

/**
 * The "bigger spot" companion to the duotone set in this folder — flat
 * mini-illustrations in a fixed 4-color brand palette (not `currentColor`
 * driven, unlike every other icon here) for empty states and the store
 * hero banner. See [[custom_icon_system]] for when to reach for which.
 * Reserved for: ProductsTable's empty state and StoreHero's sector
 * watermark — not a general-purpose icon replacement.
 */
const ORANGE = "#F97316";
const ORANGE_SOFT = "#FFEDD5";
const ORANGE_STRONG = "#C2410C";
const INK = "#0F766E";
const WHITE = "#FFFFFF";

function createIllustration(displayName: string, children: ReactNode) {
  const IllustrationComponent = forwardRef<SVGSVGElement, IconProps>(
    function Illustration({ size = 24, ...props }, ref) {
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
          {children}
        </svg>
      );
    },
  );
  IllustrationComponent.displayName = displayName;
  return IllustrationComponent;
}

export const MessageSquareIllustration = createIllustration(
  "MessageSquareIllustration",
  <>
    <path
      fill={INK}
      opacity={0.55}
      d="M3 8.2C3 7 4 6 5.2 6H14C15.2 6 16.2 7 16.2 8.2V13.4C16.2 14.6 15.2 15.6 14 15.6H8L4 18.6V15.6H5.2C4 15.6 3 14.6 3 13.4Z"
    />
    <path
      fill={ORANGE}
      d="M8.3 4.5C8.3 3.4 9.2 2.5 10.3 2.5H19C20.1 2.5 21 3.4 21 4.5V10C21 11.1 20.1 12 19 12H14L11.2 14.3V12H10.3C9.2 12 8.3 11.1 8.3 10Z"
    />
    <circle fill={WHITE} cx="12.7" cy="7.2" r="1" />
    <circle fill={WHITE} cx="15.2" cy="7.2" r="1" />
    <circle fill={WHITE} cx="17.7" cy="7.2" r="1" />
  </>,
);

export const ShieldCheckIllustration = createIllustration(
  "ShieldCheckIllustration",
  <>
    <path
      fill={ORANGE}
      d="M12 2.5 19.5 5.2v6.3c0 5-3.3 8.3-7.5 9.5-4.2-1.2-7.5-4.5-7.5-9.5V5.2Z"
    />
    <path
      fill={ORANGE_SOFT}
      d="M12 2.5 19.5 5.2v6.3c0 .5 0 1-.1 1.5L12 10.5Z"
      opacity={0.7}
    />
    <path
      fill={WHITE}
      d="M9 12.2 11.2 14.5 15.3 10"
      stroke={WHITE}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle fill={ORANGE_STRONG} cx="18.5" cy="4.5" r="1.3" />
  </>,
);

export const BellIllustration = createIllustration(
  "BellIllustration",
  <>
    <circle fill={ORANGE_SOFT} cx="12" cy="12" r="10" />
    <path
      fill={ORANGE}
      d="M7.5 11.2a4.5 4.5 0 0 1 9 0c0 3 .9 4 1.1 4.4a.45.45 0 0 1-.4.65H6.8a.45.45 0 0 1-.4-.65C6.6 15.2 7.5 14.2 7.5 11.2Z"
    />
    <ellipse fill={ORANGE_STRONG} cx="12" cy="17.3" rx="1.6" ry="1" />
    <circle fill={WHITE} cx="15.2" cy="9" r=".9" />
  </>,
);

export const ClipboardListIllustration = createIllustration(
  "ClipboardListIllustration",
  <>
    <rect fill={ORANGE_SOFT} x="5" y="5" width="14" height="16" rx="2" />
    <path fill={INK} d="M9 4h6a.5.5 0 0 1 .5.5v2h-7v-2A.5.5 0 0 1 9 4Z" />
    <rect fill={ORANGE} x="7.5" y="10.5" width="9" height="2" rx="1" />
    <rect fill={ORANGE} x="7.5" y="14.3" width="9" height="2" rx="1" />
    <rect fill={ORANGE_STRONG} x="7.5" y="18.1" width="5.5" height="2" rx="1" />
  </>,
);

export const UserRoundIllustration = createIllustration(
  "UserRoundIllustration",
  <>
    <circle fill={ORANGE_SOFT} cx="12" cy="12" r="10" />
    <circle fill={ORANGE} cx="12" cy="10" r="3.6" />
    <path
      fill={ORANGE}
      d="M5.3 19.3C6.3 15.9 8.9 14 12 14s5.7 1.9 6.7 5.3A10 10 0 0 1 5.3 19.3Z"
    />
    <path
      fill={INK}
      opacity={0.5}
      d="M12 2a10 10 0 0 1 8.7 5A10 10 0 0 0 12 2Z"
    />
  </>,
);

export const SearchXIllustration = createIllustration(
  "SearchXIllustration",
  <>
    <circle fill={ORANGE_SOFT} cx="10.5" cy="10.5" r="7.5" />
    <circle
      fill="none"
      stroke={ORANGE_STRONG}
      strokeWidth={1.8}
      cx="10.5"
      cy="10.5"
      r="7.5"
    />
    <rect
      fill={INK}
      x="15.3"
      y="19.6"
      width="5"
      height="3.4"
      rx="1.3"
      transform="rotate(-45 15.3 19.6)"
    />
    <path
      stroke={WHITE}
      strokeWidth={1.8}
      strokeLinecap="round"
      d="M7.8 7.8l5.4 5.4M13.2 7.8l-5.4 5.4"
    />
  </>,
);

export const PackageIllustration = createIllustration(
  "PackageIllustration",
  <>
    <path fill={ORANGE_STRONG} d="M4 8.2 12 4l8 4.2-8 4-8-4Z" />
    <path fill={ORANGE} d="M4 8.2 12 12.2v7.8L4 16Z" />
    <path fill={ORANGE_SOFT} d="M20 8.2 12 12.2v7.8L20 16Z" />
    <path
      stroke={WHITE}
      strokeWidth={1.3}
      strokeLinecap="round"
      fill="none"
      d="M4 8.2 12 12.2M20 8.2 12 12.2"
    />
    <rect
      fill={WHITE}
      x="10.7"
      y="12"
      width="2.6"
      height="2.6"
      rx=".5"
      transform="rotate(45 12 13.3)"
    />
  </>,
);

export const StoreIllustration = createIllustration(
  "StoreIllustration",
  <>
    <rect fill={ORANGE_SOFT} x="5" y="10.8" width="14" height="9.7" rx="1" />
    <path
      fill={ORANGE}
      d="M2.3 9.8 12 3.2l9.7 6.6-1.1 1.6c-.6.9-1.9 1.1-2.8.5l-.2-.1c-.5.6-1.3.9-2.1.7-.4.7-1.2 1-2 .8-.6.7-1.7.8-2.4.2l-.1-.1c-.6.7-1.7.7-2.4.1-.7.6-1.8.5-2.4-.2l-.2.1c-.9.6-2.2.4-2.8-.5Z"
    />
    <rect fill={INK} x="14" y="14.3" width="4" height="6.2" rx=".5" />
    <rect fill={WHITE} x="7" y="13.2" width="4" height="4" rx=".5" />
  </>,
);

export const CpuIllustration = createIllustration(
  "CpuIllustration",
  <>
    <rect fill={INK} x="6" y="6" width="12" height="12" rx="2" />
    <rect fill={ORANGE} x="9" y="9" width="6" height="6" rx="1" />
    <rect fill={ORANGE_SOFT} x="11" y="1.5" width="2" height="3.5" rx="1" />
    <rect fill={ORANGE_SOFT} x="11" y="19" width="2" height="3.5" rx="1" />
    <rect fill={ORANGE_SOFT} x="1.5" y="11" width="3.5" height="2" rx="1" />
    <rect fill={ORANGE_SOFT} x="19" y="11" width="3.5" height="2" rx="1" />
    <circle fill={WHITE} cx="12" cy="12" r="1.1" />
  </>,
);

export const ShirtIllustration = createIllustration(
  "ShirtIllustration",
  <>
    <path fill={ORANGE} d="M8 3.5 12 5l4-1.5 4 3.5-3 3-1-1v9.5H8V9l-1 1-3-3Z" />
    <path fill={ORANGE_STRONG} d="M12 5v4.5L9.7 7.2 8 3.5Z" opacity={0.6} />
    <circle fill={WHITE} cx="12" cy="14" r="1" />
    <circle fill={WHITE} cx="12" cy="17.2" r="1" />
  </>,
);

export const SparklesIllustration = createIllustration(
  "SparklesIllustration",
  <>
    <path
      fill={ORANGE_SOFT}
      d="M18 13.5c.3 1.8 1.1 2.6 2.8 2.9-1.7.3-2.5 1.1-2.8 2.9-.3-1.8-1.1-2.6-2.8-2.9 1.7-.3 2.5-1.1 2.8-2.9Z"
    />
    <path
      fill={ORANGE}
      d="M10.5 2.5c.6 3.4 2.3 5.1 5.7 5.7-3.4.6-5.1 2.3-5.7 5.7-.6-3.4-2.3-5.1-5.7-5.7 3.4-.6 5.1-2.3 5.7-5.7Z"
    />
    <circle fill={WHITE} cx="10.5" cy="8.2" r=".9" />
  </>,
);

export const PartyPopperIllustration = createIllustration(
  "PartyPopperIllustration",
  <>
    <path
      fill={INK}
      d="M4 20 14.5 9.5c1.5-1.5 1.5-3.5 0-4.5-1-1-3-1-4.5.5L5 10.5Z"
    />
    <circle fill={ORANGE} cx="19.5" cy="4.5" r="1.4" />
    <rect
      fill={ORANGE}
      x="8.6"
      y="3.6"
      width="1.6"
      height="2.8"
      rx=".8"
      transform="rotate(20 9.4 5)"
    />
    <rect
      fill={ORANGE_STRONG}
      x="3.5"
      y="8.5"
      width="2.8"
      height="1.6"
      rx=".8"
      transform="rotate(20 4.9 9.3)"
    />
    <rect
      fill={ORANGE_SOFT}
      x="16.5"
      y="6.5"
      width="1.6"
      height="2.8"
      rx=".8"
      transform="rotate(-20 17.3 7.9)"
    />
    <rect
      fill={ORANGE}
      x="18"
      y="10.6"
      width="1.6"
      height="2.8"
      rx=".8"
      transform="rotate(20 18.8 12)"
    />
    <circle fill={ORANGE_SOFT} cx="10" cy="2.5" r="1" />
  </>,
);

export const UtensilsIllustration = createIllustration(
  "UtensilsIllustration",
  <>
    <path
      fill={ORANGE}
      d="M6.3 3h1.4v6a1 1 0 0 0 2 0V3h1.4v6a2.4 2.4 0 0 1-1.7 2.3V21H7.9v-9.7A2.4 2.4 0 0 1 6.3 9Z"
    />
    <path
      fill={ORANGE_STRONG}
      d="M16 3c-1.5 0-2.5 2-2.5 5s.9 4.4 2.2 4.9V21h1.6v-8.1c1.3-.5 2.2-2 2.2-4.9 0-3-1-5-2.5-5-.3 0-.7 0-1 .1V3Z"
    />
    <circle fill={WHITE} cx="16.4" cy="7" r=".9" />
  </>,
);
