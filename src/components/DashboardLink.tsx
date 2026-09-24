"use client";

import Link from "next/link";
import { useNavigation } from "@/components/NavigationProgressContext";
import type { DashboardLinkProps } from "@/types/common";

/**
 * A link inside the vendor dashboard that follows the prefetch rule: a plain
 * click runs `navigate(href)` — the target page's data is fetched in the
 * background under the progress bar, and the route changes only once it's
 * in cache (see NavigationProgressContext / prefetch-routes.ts). It stays a
 * real <a href>, so Ctrl/Cmd-click, middle-click and "open in new tab" still
 * work the ordinary way; only an unmodified left click is taken over.
 */
export function DashboardLink({ href, onClick, ...rest }: DashboardLinkProps) {
  const { navigate } = useNavigation();
  return (
    <Link
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (
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
