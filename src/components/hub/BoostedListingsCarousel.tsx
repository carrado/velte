"use client";

import { useState, useRef, useEffect, type TouchEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CheckIcon, ZapIcon } from "@/components/icons";
import { isEnterpriseVendor } from "@/components/EnterpriseBadge";
import { cn, formatNaira } from "@/lib/utils";
import { SECTOR_BY_VALUE } from "@/lib/sectors";
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
 * - Carousel navigation arrows overlayed directly on the card
 */
function BoostedListingCard({
  item,
  onOpenListing,
  children,
}: {
  item: HubTimelineItem;
  onOpenListing?: (item: HubTimelineItem) => void;
  children?: React.ReactNode;
}) {
  const imageUrl =
    item.imageUrl || item.images?.[0] || item.listing?.images?.[0] || null;
  const price = boostedItemPrice(item);
  const sector = item.sectors?.[0] ?? null;
  const title = item.listing?.name || item.title;
  const isVerified = Boolean(item.verified || isEnterpriseVendor(item));

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-surface shadow-xs hover:border-gray-300 dark:hover:border-white/20 transition-all">
      {/* ── Image with Boosted badge & Navigation arrows directly on the div ── */}
      <div className="relative h-48 sm:h-60 w-full bg-gray-100 dark:bg-white/5 overflow-hidden group">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={title}
            className="h-full w-full object-cover cursor-pointer hover:scale-102 transition-transform duration-300"
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

        {/* Boosted badge (matches special badge style from Boost Product menu item) */}
        <span className="absolute top-3 right-3 rounded-full bg-sky-100 dark:bg-sky-900/40 px-2.5 py-0.5 text-[11px] font-bold text-sky-700 dark:text-sky-300 shadow-xs z-10">
          Boosted
        </span>

        {/* Injected carousel arrows and slide indicators */}
        {children}
      </div>

      {/* ── Content (matches preview design) ── */}
      <div className="p-3.5 sm:p-4">
        <button
          type="button"
          onClick={() => onOpenListing?.(item)}
          className="text-left font-bold text-base text-ink leading-snug hover:text-orange-600 transition-colors cursor-pointer line-clamp-1 block w-full"
        >
          {title}
        </button>

        {sector && (
          <p className="text-xs text-gray-500 dark:text-ink/60 mt-0.5 truncate">
            {sectorLabel(sector)}
          </p>
        )}

        {price && (
          <p className="mt-1.5 text-sm font-extrabold text-orange-600 dark:text-orange-400">
            {price}
          </p>
        )}

        <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
          {isVerified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 text-[11px] font-semibold text-orange-700 dark:text-orange-300">
              <CheckIcon size={11} />
              Verified Vendor
            </span>
          )}
          {item.trusted && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 text-[11px] font-semibold text-orange-700 dark:text-orange-300">
              Trusted
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * Renders all boosted listings at the top of the Hub feed in a navigable carousel.
 * No auto-sliding — advances strictly on user action (arrows or swipe).
 * Arrows are positioned directly on the feed listing div.
 */
export function BoostedListingsCarousel({
  items,
  onOpenListing,
}: BoostedListingsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const count = items.length;

  // Keep index within bounds if items change
  useEffect(() => {
    if (currentIndex >= count) {
      setCurrentIndex(Math.max(0, count - 1));
    }
  }, [count, currentIndex]);

  if (count === 0) return null;

  // Single boosted item: rendered cleanly without navigation arrows
  if (count === 1) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 dark:text-sky-300">
            <ZapIcon size={14} className="fill-sky-500 text-sky-500" />
            <span>Boosted Product</span>
          </span>
        </div>
        <BoostedListingCard item={items[0]} onOpenListing={onOpenListing} />
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

  const currentItem = items[currentIndex] || items[0];

  return (
    <div
      className="space-y-2"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Top Header ── */}
      <div className="flex items-center justify-between px-1">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 dark:text-sky-300">
          <ZapIcon size={14} className="fill-sky-500 text-sky-500" />
          <span>Boosted Listings</span>
        </span>
      </div>

      {/* ── Slide Content with AnimatePresence & Arrows directly ON the listing div ── */}
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
            <BoostedListingCard
              item={currentItem}
              onOpenListing={onOpenListing}
            >
              {/* Previous button directly on the listing div */}
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous boosted listing"
                className="absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs transition-all shadow-md z-20 cursor-pointer active:scale-95"
              >
                <ChevronLeft size={18} />
              </button>

              {/* Next button directly on the listing div */}
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next boosted listing"
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs transition-all shadow-md z-20 cursor-pointer active:scale-95"
              >
                <ChevronRight size={18} />
              </button>

              {/* Slide dots at the bottom of the image */}
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-full pointer-events-auto">
                {items.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDirection(idx > currentIndex ? 1 : -1);
                      setCurrentIndex(idx);
                    }}
                    aria-label={`Go to boosted listing ${idx + 1}`}
                    className={cn(
                      "h-1.5 rounded-full transition-all cursor-pointer",
                      idx === currentIndex
                        ? "w-4 bg-orange-500"
                        : "w-1.5 bg-white/50 hover:bg-white/80",
                    )}
                  />
                ))}
              </div>
            </BoostedListingCard>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
