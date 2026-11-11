"use client";

import { useState, useRef, useEffect, type TouchEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ZapIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { HubTimelineItem } from "@/types/hub";
import { TimelineFeedCard } from "./TimelineFeedCard";

interface BoostedListingsCarouselProps {
  items: HubTimelineItem[];
  now: number;
  viewerId?: string;
  onOpenListing?: (item: HubTimelineItem) => void;
}

/**
 * Renders all boosted listings at the top of the Hub feed in a swipeable / navigable carousel.
 * Boosted listings strictly occupy ONLY this top spot and never mix into the scroll feed below.
 */
export function BoostedListingsCarousel({
  items,
  now,
  viewerId,
  onOpenListing,
}: BoostedListingsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const count = items.length;

  // Keep index within bounds if items change
  useEffect(() => {
    if (currentIndex >= count) {
      setCurrentIndex(Math.max(0, count - 1));
    }
  }, [count, currentIndex]);

  // Gentle auto-slide when multiple boosted listings exist
  useEffect(() => {
    if (count <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev < count - 1 ? prev + 1 : 0));
    }, 6000);
    return () => clearInterval(interval);
  }, [count, isPaused]);

  if (count === 0) return null;

  // Single boosted item: rendered cleanly with the top badge
  if (count === 1) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 dark:text-orange-400">
            <ZapIcon size={14} className="fill-orange-500 text-orange-500" />
            <span>Sponsored Boosted Product</span>
          </span>
        </div>
        <TimelineFeedCard
          item={items[0]}
          now={now}
          viewerId={viewerId}
          onOpenListing={onOpenListing}
          isLeader
        />
      </div>
    );
  }

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDirection(-1);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : count - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDirection(1);
    setCurrentIndex((prev) => (prev < count - 1 ? prev + 1 : 0));
  };

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    setIsPaused(true);
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 40) {
      handleNext();
    } else if (distance < -40) {
      handlePrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const currentItem = items[currentIndex] || items[0];

  return (
    <div
      className="space-y-2"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Top Carousel Control Header ── */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 dark:text-orange-400">
            <ZapIcon size={14} className="fill-orange-500 text-orange-500" />
            <span>Sponsored Boosted Listings</span>
          </span>
          <span className="rounded-full bg-orange-100 dark:bg-orange-950/40 px-2 py-0.5 text-[10px] font-bold text-orange-700 dark:text-orange-300">
            {currentIndex + 1} of {count}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Slide dots */}
          <div className="flex items-center gap-1 mr-2">
            {items.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setDirection(idx > currentIndex ? 1 : -1);
                  setCurrentIndex(idx);
                }}
                aria-label={`Go to boosted listing ${idx + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all cursor-pointer",
                  idx === currentIndex
                    ? "w-4 bg-orange-500"
                    : "w-1.5 bg-gray-300 dark:bg-white/20 hover:bg-gray-400",
                )}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous boosted product"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 bg-surface text-gray-600 dark:text-ink/80 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-orange-600 transition-colors cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next boosted product"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 bg-surface text-gray-600 dark:text-ink/80 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-orange-600 transition-colors cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── Slide Content with AnimatePresence ── */}
      <div className="relative overflow-hidden rounded-2xl">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentItem.id}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
          >
            <TimelineFeedCard
              item={currentItem}
              now={now}
              viewerId={viewerId}
              onOpenListing={onOpenListing}
              isLeader
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
