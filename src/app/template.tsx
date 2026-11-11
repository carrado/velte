"use client";

import { useEffect, useLayoutEffect } from "react";

// Use useLayoutEffect in the browser so scroll is reset before the initial paint,
// preventing any flash of the old scroll position when the new page mounts.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Universal Route Template
 *
 * In Next.js App Router, templates create a new instance on every route navigation.
 * This guarantees that scroll-to-top executes strictly when the new page component
 * is mounted and in view on the viewport, without prematurely scrolling the previous page.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  useIsomorphicLayoutEffect(() => {
    if (typeof window === "undefined") return;

    // Prevent browser auto scroll restoration from restoring prior page offset
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    // Preserve anchor jump if navigation explicitly targeted an in-page hash
    if (window.location.hash) {
      const hashTarget = document.querySelector(window.location.hash);
      if (hashTarget) return;
    }

    const resetScrollToTop = () => {
      const html = document.documentElement;
      const body = document.body;

      const prevHtmlBehavior = html.style.scrollBehavior;
      const prevBodyBehavior = body.style.scrollBehavior;
      html.style.scrollBehavior = "auto";
      body.style.scrollBehavior = "auto";

      // 1. Reset window and document roots instantly
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      html.scrollTop = 0;
      body.scrollTop = 0;

      // 2. Reset any dashboard/custom overflow scroll containers
      const scrollContainers = document.querySelectorAll<HTMLElement>(
        "main, [data-scroll-container], .overflow-y-auto, [role='main']",
      );
      scrollContainers.forEach((container) => {
        container.scrollTop = 0;
        container.scrollLeft = 0;
      });

      requestAnimationFrame(() => {
        html.style.scrollBehavior = prevHtmlBehavior;
        body.style.scrollBehavior = prevBodyBehavior;
      });
    };

    // Reset immediately on mount before browser paint
    resetScrollToTop();

    // Re-verify on next animation frame after React commits initial layout
    const rafId = requestAnimationFrame(resetScrollToTop);

    // Re-verify after a short delay in case async data streaming or hydration expands content
    const t1 = setTimeout(resetScrollToTop, 60);
    const t2 = setTimeout(resetScrollToTop, 180);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return <>{children}</>;
}
