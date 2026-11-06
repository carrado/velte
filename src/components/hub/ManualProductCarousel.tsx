"use client";

import { useState, useRef, useEffect, type TouchEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ManualProductCarouselProps {
  images: string[];
  altTitle: string;
  className?: string;
  aspectRatio?: "video" | "square" | "wide";
  autoSlide?: boolean;
  autoSlideInterval?: number;
  onImageClick?: (index: number) => void;
}

/**
 * A responsive product carousel that automatically slides between images
 * when more than one image exists, while allowing users to swipe or use chevrons.
 */
export function ManualProductCarousel({
  images,
  altTitle,
  className,
  aspectRatio = "video",
  autoSlide = true,
  autoSlideInterval = 3500,
  onImageClick,
}: ManualProductCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const validImages = images.filter(Boolean);
  const count = validImages.length;

  // Auto-advance slides if there are multiple images
  useEffect(() => {
    if (!autoSlide || count <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev < count - 1 ? prev + 1 : 0));
    }, autoSlideInterval);

    return () => clearInterval(timer);
  }, [autoSlide, count, isPaused, autoSlideInterval]);

  if (count === 0) {
    return (
      <div
        className={cn(
          "w-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-400 text-xs rounded-xl",
          aspectRatio === "video" ? "aspect-video" : "aspect-square",
          className,
        )}
      >
        No images available
      </div>
    );
  }

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : count - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
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
    const isSwipeLeft = distance > 45;
    const isSwipeRight = distance < -45;

    if (isSwipeLeft && count > 1) {
      setCurrentIndex((prev) => (prev < count - 1 ? prev + 1 : 0));
    }
    if (isSwipeRight && count > 1) {
      setCurrentIndex((prev) => (prev > 0 ? prev - 1 : count - 1));
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  const aspectClass =
    aspectRatio === "video"
      ? "aspect-[16/10] sm:aspect-[16/9]"
      : aspectRatio === "wide"
        ? "aspect-[2/1]"
        : "aspect-square";

  return (
    <div
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl bg-gray-900 select-none",
        aspectClass,
        className,
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slides Container */}
      <div
        className="flex h-full w-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {validImages.map((src, idx) => (
          <div
            key={`${src}-${idx}`}
            className="relative h-full w-full shrink-0 cursor-pointer overflow-hidden bg-gray-950 flex items-center justify-center"
            onClick={() => onImageClick?.(idx)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`${altTitle} - ${idx + 1}`}
              className="h-full w-full object-cover"
              loading={idx === 0 ? "eager" : "lazy"}
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* Navigation Controls (only if multiple images) */}
      {count > 1 && (
        <>
          {/* Left Arrow Button */}
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous image"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-black/60 text-white shadow-md backdrop-blur-xs hover:bg-black/80 transition-all opacity-80 sm:opacity-0 group-hover:opacity-100 cursor-pointer z-10"
          >
            <ChevronLeft size={18} />
          </button>

          {/* Right Arrow Button */}
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next image"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-black/60 text-white shadow-md backdrop-blur-xs hover:bg-black/80 transition-all opacity-80 sm:opacity-0 group-hover:opacity-100 cursor-pointer z-10"
          >
            <ChevronRight size={18} />
          </button>

          {/* Slide Dots Indicator */}
          <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-1.5 z-10 pointer-events-none">
            {validImages.map((_, dotIdx) => (
              <span
                key={dotIdx}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300 drop-shadow-xs",
                  dotIdx === currentIndex
                    ? "w-4 bg-white"
                    : "w-1.5 bg-white/50",
                )}
              />
            ))}
          </div>

          {/* Slide Count Pill */}
          <div className="absolute top-3 right-3 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs z-10 pointer-events-none">
            {currentIndex + 1} / {count}
          </div>
        </>
      )}
    </div>
  );
}

// Alias for readability
export const ProductImageCarousel = ManualProductCarousel;
