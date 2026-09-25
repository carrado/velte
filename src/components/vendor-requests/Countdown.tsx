"use client";

import { useNow } from "@/hooks/useNow";
import { countdown } from "@/lib/requestWindow";
import { cn } from "@/lib/utils";
import type { CountdownProps } from "@/types/buyerRequest";

/** A request's closing time, ticking every second. Owns its own clock so only
 *  this span re-renders each second, not the whole page around it.
 *  `tabular-nums` keeps the digits from jittering as they change. */
export function Countdown({
  expiresAt,
  suffix = "",
  className,
}: CountdownProps) {
  const now = useNow(1000);
  const text = countdown(expiresAt, now);
  return (
    <span className={cn("tabular-nums", className)} suppressHydrationWarning>
      {text}
      {text !== "closing now" && suffix}
    </span>
  );
}
