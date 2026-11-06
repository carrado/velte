"use client";

import Link from "next/link";
import { useNavigation } from "@/components/hub/HubNavigationProgressContext";
import type { DashboardLinkProps } from "@/types/common";

/**
 * Hub-tree counterpart to `DashboardLink`: plain click runs `navigate(href)`
 * so the target's page-blocking data is prefetched under the progress bar
 * before the route changes. Stays a real `<a href>` for new-tab / modified clicks.
 */
export function HubLink({ href, onClick, ...rest }: DashboardLinkProps) {
  const { navigate, active } = useNavigation();
  return (
    <Link
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (
          !active ||
          e.defaultPrevented ||
          e.button !== 0 ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey
        ) {
          return;
        }
        e.preventDefault();
        navigate(href);
      }}
      {...rest}
    />
  );
}
