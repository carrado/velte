"use client";

import { CrownIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { isEnterpriseVendor } from "@/lib/enterprise";

export { isEnterpriseVendor };

interface EnterpriseAvatarBadgeProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * A sleek icon badge positioned on the corner of the vendor's profile picture
 * to clearly communicate their Enterprise plan status.
 */
export function EnterpriseAvatarBadge({
  size = "md",
  className,
}: EnterpriseAvatarBadgeProps) {
  const sizeClasses = {
    sm: "h-3.5 w-3.5 bottom-0 right-0 ring-[1.5px]",
    md: "h-4.5 w-4.5 -bottom-0.5 -right-0.5 ring-2",
    lg: "h-5.5 w-5.5 -bottom-1 -right-1 ring-2",
  }[size];

  const iconSizes = {
    sm: 8,
    md: 10,
    lg: 12,
  }[size];

  return (
    <span
      title="Enterprise Plan"
      aria-label="Enterprise Vendor"
      className={cn(
        "absolute z-20 flex items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 text-white shadow-xs ring-white dark:ring-gray-900 select-none",
        sizeClasses,
        className,
      )}
    >
      <CrownIcon
        size={iconSizes}
        weight="fill"
        className="shrink-0 drop-shadow-xs"
      />
    </span>
  );
}

interface EnterpriseBadgeProps {
  size?: "sm" | "md";
  className?: string;
}

/**
 * An inline pill badge shown next to the vendor's business name.
 */
export function EnterpriseBadge({
  size = "md",
  className,
}: EnterpriseBadgeProps) {
  const isSm = size === "sm";

  return (
    <span
      title="Enterprise Plan"
      aria-label="Enterprise Plan"
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full font-bold uppercase tracking-wider select-none border transition-colors",
        "bg-gradient-to-r from-amber-500/15 to-orange-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400",
        isSm ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
        className,
      )}
    >
      <CrownIcon
        size={isSm ? 10 : 12}
        weight="fill"
        className="text-amber-500 shrink-0"
      />
      <span>Enterprise</span>
    </span>
  );
}
