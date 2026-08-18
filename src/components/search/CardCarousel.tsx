"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

// Generic horizontal carousel for a row of result cards (products, stores,
// external suggestions, …) — replaces the old CSS grid wherever a section
// can have more than one card. Each item gets wrapped in a fixed-width,
// non-shrinking, scroll-snapped slide so cards line up evenly regardless of
// their own internal content length; the row itself scrolls natively
// (touch/trackpad/scrollbar all just work), the two arrow buttons are a
// convenience on top of that, not the only way to move it. An arrow only
// renders on the side there's actually more to see — found early that
// showing both permanently, greyed out at the ends, read as broken/dead
// controls rather than a clear "you've reached the end."
export function CardCarousel<T>({
  items,
  renderItem,
  getKey,
  slideClassName = "w-[260px] sm:w-[280px]",
}: {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  getKey: (item: T) => string;
  // Wider slides (e.g. a product group with its own "Sold by" companion)
  // pass a wider width in here rather than this component guessing.
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
    // ~85% of the visible width, not a full page — leaves the next card
    // partially in view before the jump, so the motion reads as "sliding
    // over," not an abrupt cut to a completely new set of cards.
    el.scrollBy({
      left: direction * el.clientWidth * 0.85,
      behavior: "smooth",
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        // No `scroll-smooth` here on purpose — that sets scroll-behavior:
        // smooth for EVERY scroll on this element, not just the arrow
        // buttons' own scrollBy() calls (those already pass their own
        // `behavior: "smooth"` independently, so dropping the class here
        // doesn't touch them). Left on, it fights native touch-drag
        // momentum on iOS Safari and several Android WebViews — found live:
        // the row read as stuck/unresponsive to a finger swipe, not just
        // less smooth. `-webkit-overflow-scrolling: touch` is the
        // companion fix, for buttery momentum on older iOS specifically.
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-1 -mx-1 px-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <div
            key={getKey(item)}
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
          className="flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/3 sm:-translate-x-1/2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white shadow-md border border-gray-100 items-center justify-center text-gray-600 hover:text-orange-600 hover:shadow-lg transition-all cursor-pointer z-10"
        >
          <ChevronLeftIcon size={16} />
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByPage(1)}
          aria-label="Scroll right"
          className="flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/3 sm:translate-x-1/2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white shadow-md border border-gray-100 items-center justify-center text-gray-600 hover:text-orange-600 hover:shadow-lg transition-all cursor-pointer z-10"
        >
          <ChevronRightIcon size={16} />
        </button>
      )}
    </div>
  );
}
