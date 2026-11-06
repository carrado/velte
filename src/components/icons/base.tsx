"use client";

import { forwardRef, type ComponentType, type SVGProps } from "react";
import type { IconProps, IconWeight } from "@/types/common";

/**
 * Factory behind Velte's icon set — thin wrappers over `@phosphor-icons/react`
 * that keep the existing `*Icon` names and `IconProps` (`size`, `className`,
 * `currentColor` via CSS) so call sites stay unchanged. Default weight is
 * `duotone`; pass `weight` on a call site (or bake a different default into
 * `wrapIcon`) for fill / regular / bold.
 *
 * `strokeWidth` is accepted and ignored — Phosphor uses `weight`, not stroke.
 */
type PhosphorProps = {
  size?: number | string;
  weight?: IconWeight;
  color?: string;
  mirrored?: boolean;
  alt?: string;
  className?: string;
} & SVGProps<SVGSVGElement>;

type PhosphorComponent = ComponentType<PhosphorProps>;

export function wrapIcon(
  Phosphor: PhosphorComponent,
  defaults: { weight?: IconWeight; displayName?: string } = {},
) {
  const defaultWeight = defaults.weight ?? "duotone";
  const IconComponent = forwardRef<SVGSVGElement, IconProps>(function Icon(
    { size = 24, strokeWidth: _strokeWidth, weight, ...props },
    ref,
  ) {
    return (
      <Phosphor
        ref={ref}
        size={size}
        weight={weight ?? defaultWeight}
        aria-hidden="true"
        {...props}
      />
    );
  });
  IconComponent.displayName =
    defaults.displayName ?? Phosphor.displayName ?? "Icon";
  return IconComponent;
}
