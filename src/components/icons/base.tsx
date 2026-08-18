import { forwardRef, type ReactNode } from "react";
import type { IconProps } from "@/types/common";

/**
 * Factory behind Velte's duotone icon set (2026-08-17 restyle — flat filled
 * shapes in two tones of the same `currentColor`, replacing the earlier
 * stroke-line set; see [[custom_icon_system]]). `base` is the icon's own
 * filled silhouette at reduced opacity (the soft "container"); `accent` is
 * the smaller foreground mark — a checkmark, a dot, a card slot — at full
 * opacity (the "detail"). Both derive from `currentColor`, so every
 * existing `text-*` className, hover state, or conditional status color
 * still drives the icon exactly as before — no call site has to change.
 * `base` is optional: pure glyphs with no natural closed silhouette
 * (arrows, chevrons, plus/close) just render their accent at full opacity.
 */
export function createIcon(
  displayName: string,
  layers: { base?: ReactNode; accent: ReactNode },
) {
  const IconComponent = forwardRef<SVGSVGElement, IconProps>(function Icon(
    { size = 24, strokeWidth = 1.8, ...props },
    ref,
  ) {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...props}
      >
        {layers.base && (
          <g fill="currentColor" fillOpacity={0.32} stroke="none">
            {layers.base}
          </g>
        )}
        <g fill="currentColor" stroke="none">
          {layers.accent}
        </g>
      </svg>
    );
  });
  IconComponent.displayName = displayName;
  return IconComponent;
}
