"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

// Generic horizontal carousel for a row of result cards (products, stores,
// external suggestions, …) — Google Places-style: one card per slide in a
// swipeable row, with the next card peeking so it's obvious you can scroll.
// Touch/trackpad/scrollbar all work natively; the arrow buttons are a
// desktop convenience on top, not the only way to move. An arrow only
// renders on the side there's actually more to see — showing both
// permanently, greyed out at the ends, read as broken/dead controls.
export function CardCarousel<T>({
  items,
  renderItem,
  getKey,
  // Wider slides pass a custom width rather than this component guessing.
  slideClassName = "w-[min(280px,78%)] sm:w-[280px]",
}: {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  getKey: (item: T) => string;
  slideClassName?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateArrows() {
    const el = scrollRef.current;
    if (!el) return;
    // A few px of slack — sub-pixel scroll rounding otherwise leaves an
    // arrow visible when the row is actually already at its true end.
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    updateArrows();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    // Catches both a window resize AND the row's own content changing size
    // (e.g. this turn's cards finish loading images) — either can flip
    // whether there's anything left to scroll to.
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      ro.disconnect();
    };
  }, [items.length]);

  function scrollByPage(direction: 1 | -1) {
    const el = scrollRef.current;
    if (!el) return;
    // One slide at a time when we can measure one; otherwise ~85% of the
    // visible width — leaves the next card partially in view so the motion
    // reads as "sliding over," not an abrupt cut.
    const slide = el.querySelector<HTMLElement>("[data-carousel-slide]");
    const delta = slide ? slide.offsetWidth + 16 : el.clientWidth * 0.85;
    el.scrollBy({
      left: direction * delta,
      behavior: "smooth",
    });
  }

  if (items.length === 0) return null;

  // A single card still uses the same slide width so "1 result" and "many
  // results" share one visual language — just no arrows / nothing to swipe.
  if (items.length === 1) {
    return (
      <div
        data-slide-id={getKey(items[0])}
        className={cn("max-w-full", slideClassName)}
      >
        {renderItem(items[0])}
      </div>
    );
  }

  return (
    <div className="relative -mx-1">
      <div
        ref={scrollRef}
        // No `scroll-smooth` here on purpose — that sets scroll-behavior:
        // smooth for EVERY scroll on this element, not just the arrow
        // buttons' own scrollBy() calls (those already pass their own
        // `behavior: "smooth"` independently). Left on, it fights native
        // touch-drag momentum on iOS Safari and several Android WebViews —
        // found live: the row read as stuck/unresponsive to a finger swipe.
        // `touch-pan-x` prefers horizontal pans so the parent chat's
        // vertical scroll doesn't steal the gesture mid-swipe.
        className="flex gap-4 overflow-x-auto overscroll-x-contain snap-x snap-mandatory pb-1 px-1 touch-pan-x [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <div
            key={getKey(item)}
            data-carousel-slide
            // Addressable by id so the recommendation block above can scroll
            // straight to the card it is talking about (see
            // RecommendationPicks' own scrollToCard). Set on the SLIDE, not
            // the card, because the slide is what the scroll container
            // actually positions.
            data-slide-id={getKey(item)}
            className={cn("shrink-0 snap-start", slideClassName)}
          >
            {renderItem(item)}
          </div>
        ))}
      </div>
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByPage(-1)}
          aria-label="Scroll left"
          className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-md border border-gray-100 items-center justify-center text-gray-600 hover:text-orange-600 hover:shadow-lg transition-all cursor-pointer z-10"
        >
          <ChevronLeftIcon size={16} />
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByPage(1)}
          aria-label="Scroll right"
          className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-md border border-gray-100 items-center justify-center text-gray-600 hover:text-orange-600 hover:shadow-lg transition-all cursor-pointer z-10"
        >
          <ChevronRightIcon size={16} />
        </button>
      )}
    </div>
  );
}
