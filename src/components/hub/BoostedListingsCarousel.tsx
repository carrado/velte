"use client";

import { useState, useRef, useEffect, useMemo, type TouchEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CheckIcon, ZapIcon } from "@/components/icons";
import { isEnterpriseVendor } from "@/components/EnterpriseBadge";
import { cn, formatNaira } from "@/lib/utils";
import { SECTOR_BY_VALUE } from "@/lib/sectors";
import { isSponsoredAdvert } from "@/lib/hubFeed";
import { ProtectedPosterPreview } from "@/components/hub/ProtectedPosterPreview";
import type { HubTimelineItem } from "@/types/hub";

interface BoostedListingsCarouselProps {
  items: HubTimelineItem[];
  now: number;
  viewerId?: string;
  onOpenListing?: (item: HubTimelineItem) => void;
}

function sectorLabel(value?: string | null) {
  if (!value) return null;
  return SECTOR_BY_VALUE[value]?.label ?? value.replace(/_/g, " ");
}

function boostedItemPrice(item: HubTimelineItem): string | null {
  if (item.listing?.quoteOnRequest) return "Contact for quote";
  if (item.listing?.priceMax && item.listing.priceMax > item.listing.price) {
    return `${formatNaira(item.listing.price)} – ${formatNaira(item.listing.priceMax)}`;
  }
  if (item.listing?.price && item.listing.price > 0) {
    return formatNaira(item.listing.price);
  }
  return null;
}

/**
 * Clean card that matches the Preview design from the Boost page:
 * - Full-bleed top image with "Boosted" pill badge top-right
 * - Title, Sector label, Price
 * - Verified & Trusted badge chips
 */
function BoostedListingCard({
  item,
  onOpenListing,
  single = false,
  children,
}: {
  item: HubTimelineItem;
  onOpenListing?: (item: HubTimelineItem) => void;
  single?: boolean;
  children?: React.ReactNode;
}) {
  const imageUrl =
    item.imageUrl || item.images?.[0] || item.listing?.images?.[0] || null;
  const price = boostedItemPrice(item);
  const sector = item.sectors?.[0] ?? null;
  const title = item.listing?.name || item.title;
  const isVerified = Boolean(item.verified || isEnterpriseVendor(item));
  const isAdvert = isSponsoredAdvert(item);

  return (
    <article className="group/card flex flex-col h-full overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-surface shadow-xs hover:border-orange-300 dark:hover:border-orange-500/30 hover:shadow-md transition-all">
      {/* ── Image with Boosted badge ── */}
      <div
        className={cn(
          "relative w-full bg-gray-100 dark:bg-white/5 overflow-hidden shrink-0",
          single ? "h-48 sm:h-60" : "aspect-[4/3] sm:aspect-[16/10]",
        )}
      >
        {imageUrl ? (
          <ProtectedPosterPreview
            src={imageUrl}
            fit="cover"
            className="h-full w-full cursor-pointer group-hover/card:scale-103 transition-transform duration-300"
            onClick={() => onOpenListing?.(item)}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-xs text-gray-400 cursor-pointer"
            onClick={() => onOpenListing?.(item)}
          >
            No image available
          </div>
        )}

        {/* Boosted badge */}
        <span className="absolute top-2.5 right-2.5 rounded-full bg-sky-100 dark:bg-sky-900/40 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-sky-700 dark:text-sky-300 shadow-xs z-10 flex items-center gap-1 pointer-events-none">
          <ZapIcon
            size={10}
            className="fill-current text-sky-600 dark:text-sky-400"
          />
          <span>Boosted</span>
        </span>

        {children}
      </div>

      {/* ── Content ── */}
      <div className="p-3 sm:p-3.5 flex flex-col flex-1 justify-between">
        <div>
          <button
            type="button"
            onClick={() => onOpenListing?.(item)}
            className="text-left font-bold text-sm sm:text-base text-ink leading-snug hover:text-orange-600 transition-colors cursor-pointer line-clamp-1 block w-full"
          >
            {title}
          </button>

          {sector && (
            <p className="text-[11px] sm:text-xs text-gray-500 dark:text-ink/60 mt-0.5 truncate">
              {sectorLabel(sector)}
            </p>
          )}

          {price && (
            <p className="mt-1 text-xs sm:text-sm font-extrabold text-orange-600 dark:text-orange-400">
              {price}
            </p>
          )}
        </div>

        <div className="mt-2 flex flex-wrap gap-1 items-center">
          {isVerified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 dark:bg-orange-950/40 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 dark:text-orange-300">
              <CheckIcon size={10} />
              <span>Verified</span>
            </span>
          )}
          {item.trusted && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 dark:bg-orange-950/40 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 dark:text-orange-300">
              <span>Trusted</span>
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * Renders boosted listings at the top of the Hub feed in a 2-product carousel.
 * Displays 2 products per slide with smooth animations, arrows, indicators, and swipe gestures.
 * Advances strictly on user action (no unexpected auto-sliding).
 */
export function BoostedListingsCarousel({
  items,
  onOpenListing,
}: BoostedListingsCarouselProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const count = items.length;

  // Chunk listings into pairs of 2 products per slide
  const pages = useMemo(() => {
    if (items.length <= 1) return [items];
    const result: HubTimelineItem[][] = [];
    for (let i = 0; i < items.length; i += 2) {
      if (i + 1 < items.length) {
        result.push([items[i], items[i + 1]]);
      } else {
        // If odd number of listings, wrap the first item so every slide displays 2 products
        result.push([items[i], items[0]]);
      }
    }
    return result;
  }, [items]);

  const totalPages = pages.length;

  useEffect(() => {
    if (pageIndex >= totalPages) {
      setPageIndex(Math.max(0, totalPages - 1));
    }
  }, [totalPages, pageIndex]);

  if (count === 0) return null;

  // Single boosted item: rendered cleanly without extra navigation controls
  if (count === 1) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 dark:text-sky-300">
            <ZapIcon size={14} className="fill-sky-500 text-sky-500" />
            <span>Boosted Product</span>
          </span>
        </div>
        <BoostedListingCard
          item={items[0]}
          onOpenListing={onOpenListing}
          single
        />
      </div>
    );
  }

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDirection(-1);
    setPageIndex((prev) => (prev > 0 ? prev - 1 : totalPages - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDirection(1);
    setPageIndex((prev) => (prev < totalPages - 1 ? prev + 1 : 0));
  };

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
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

  const currentPageItems = pages[pageIndex] || pages[0];

  return (
    <div
      className="space-y-2"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Top Header with Title and Pagination Controls ── */}
      <div className="flex items-center justify-between px-1">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 dark:text-sky-300">
          <ZapIcon size={14} className="fill-sky-500 text-sky-500" />
          <span>Boosted Listings</span>
        </span>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-gray-400 dark:text-ink/40 mr-1">
              {pageIndex + 1} / {totalPages}
            </span>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous boosted listings"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 dark:border-white/10 bg-surface hover:bg-gray-100 dark:hover:bg-white/5 text-ink transition-all cursor-pointer active:scale-95 shadow-2xs"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next boosted listings"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 dark:border-white/10 bg-surface hover:bg-gray-100 dark:hover:bg-white/5 text-ink transition-all cursor-pointer active:scale-95 shadow-2xs"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>

      {/* ── Slide Content: 2 Products in 1 Carousel View ── */}
      <div className="relative overflow-hidden rounded-2xl">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={pageIndex}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
          >
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
              {currentPageItems.map((item, idx) => (
                <BoostedListingCard
                  key={`${item.id}-${idx}`}
                  item={item}
                  onOpenListing={onOpenListing}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Floating Side Arrows on larger screens */}
        {totalPages > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous boosted listings"
              className="hidden sm:flex absolute left-1.5 top-[38%] -translate-y-1/2 h-8 w-8 items-center justify-center rounded-full bg-black/65 hover:bg-black/85 text-white backdrop-blur-xs transition-all shadow-md z-20 cursor-pointer active:scale-95"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next boosted listings"
              className="hidden sm:flex absolute right-1.5 top-[38%] -translate-y-1/2 h-8 w-8 items-center justify-center rounded-full bg-black/65 hover:bg-black/85 text-white backdrop-blur-xs transition-all shadow-md z-20 cursor-pointer active:scale-95"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>

      {/* Slide dots at the bottom if multiple pages */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-1">
          {pages.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDirection(idx > pageIndex ? 1 : -1);
                setPageIndex(idx);
              }}
              aria-label={`Go to boosted slide ${idx + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all cursor-pointer",
                idx === pageIndex
                  ? "w-4 bg-orange-500"
                  : "w-1.5 bg-gray-300 dark:bg-white/30 hover:bg-gray-400 dark:hover:bg-white/50",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
