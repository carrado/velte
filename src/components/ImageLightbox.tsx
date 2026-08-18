"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ProtectedImage } from "@/components/ProtectedImage";
import { optimizedImageUrl } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
} from "@/components/icons";

/** Full-viewport, black-backdrop large image view — tapping a product
 * card's own photo opens this directly (distinct from "See more", which
 * opens ListingDetailModal/DetailSheet's white info sheet). Carousel
 * controls only render when there's more than one image. Portals to
 * document.body for the same reason DetailSheet does (a `position: fixed`
 * overlay can still get clipped by an `overflow-hidden` card ancestor if
 * any ancestor also sets a transform), and shares its ESC/scroll-lock
 * idiom. Deliberately simpler than DetailSheet otherwise — no drag-to-
 * dismiss, no footer — this is just "look at the photo(s)," not a detail
 * view. */
export function ImageLightbox({
  images,
  initialIndex = 0,
  open,
  onClose,
  alt,
}: {
  images: string[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
  alt: string;
}) {
  const [index, setIndex] = useState(initialIndex);
  const hasGallery = images.length > 1;

  // Jump to whichever photo was actually tapped, every time this opens
  // (React's documented render-phase "adjust state when a prop changes"
  // pattern, not an effect, so there's no stale-index flash before the
  // reset takes effect).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setIndex(initialIndex);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (hasGallery && e.key === "ArrowLeft") {
        setIndex((i) => (i - 1 + images.length) % images.length);
      }
      if (hasGallery && e.key === "ArrowRight") {
        setIndex((i) => (i + 1) % images.length);
      }
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, hasGallery, images.length]);

  // Same SSR guard DetailSheet/AnchoredPopover use — createPortal's target
  // is evaluated at call time, and `document` doesn't exist server-side.
  if (typeof document === "undefined" || !open || images.length === 0) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black animate-in fade-in duration-150"
      onClick={onClose}
    >
      {/* z-10 on both — the image wrapper below is also `relative` and
          comes later in DOM order, so without an explicit z-index it wins
          the (both-auto) stacking tie and paints on top of these,
          silently swallowing clicks meant for the close button. */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
      >
        <CloseIcon size={20} />
      </button>

      {hasGallery && (
        <span className="absolute top-4 left-4 z-10 px-2.5 py-1 rounded-full bg-white/10 text-white text-xs font-semibold tabular-nums">
          {index + 1} / {images.length}
        </span>
      )}

      <div
        className="relative w-full h-full flex items-center justify-center p-4 sm:p-12"
        onClick={(e) => e.stopPropagation()}
      >
        <ProtectedImage
          src={optimizedImageUrl(images[index])}
          alt={alt}
          className="max-w-full max-h-full object-contain"
        />

        {hasGallery && (
          <>
            {/* Solid white, not the translucent-on-black treatment the
                close button/counter use — those sit on empty backdrop, but
                these need to read clearly over a busy or bright PHOTO
                behind them, where a faint white/10 circle can wash out
                completely. */}
            <button
              type="button"
              onClick={() =>
                setIndex((i) => (i - 1 + images.length) % images.length)
              }
              aria-label="Previous photo"
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-900 shadow-lg ring-1 ring-black/10 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <ChevronLeftIcon size={22} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => (i + 1) % images.length)}
              aria-label="Next photo"
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-900 shadow-lg ring-1 ring-black/10 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <ChevronRightIcon size={22} strokeWidth={2.5} />
            </button>
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((url, i) => (
                <span
                  key={url}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === index ? "w-5 bg-white" : "w-1.5 bg-white/40",
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
