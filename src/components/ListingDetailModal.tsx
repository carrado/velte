"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useDragControls } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  Package,
  Store as StoreIcon,
  Wrench,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fmt } from "@/lib/product-price";
import { ProtectedImage } from "@/components/ProtectedImage";
import { optimizedImageUrl } from "@/lib/cloudinary";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { OwnListingBadge } from "@/components/search/OwnListingBadge";
import { useMediaQuery } from "@/hooks/useMediaQuery";

// Generic enough to back a product OR a service from any buyer-facing
// listing surface (public store page, homepage marketplace preview, search
// results) — each call site maps its own item shape into this one instead
// of this component knowing about PublicStoreProduct/MarketplacePreviewItem/
// VendorMatch individually.
export interface ListingDetailItem {
  name: string;
  kind: "product" | "service";
  quoteOnRequest: boolean;
  /** Kobo — divided by 100 internally, same raw-kobo convention every
   *  listing source already uses (see e.g. MarketplaceCard's own comment). */
  price: number;
  priceMax: number | null;
  currency: string;
  /** Main image first, then the rest — see resolveGalleryImages. */
  images: string[];
  description: string | null;
  attributes: { name: string; value: string }[];
}

// Bottom sheet (phone) vs. centered dialog (tablet+) get genuinely different
// motion values, not just different CSS positioning — a spring slide from
// y:"100%" reads as a sheet, a fade+scale from a few px up reads as a
// dialog. Kept as plain objects so both variants share one `transition`
// prop shape.
const SHEET_TRANSITION = {
  type: "spring" as const,
  stiffness: 380,
  damping: 34,
};
const DIALOG_TRANSITION = {
  type: "spring" as const,
  stiffness: 420,
  damping: 32,
};

/** The full-detail view a listing card's "See more" opens into — shared by
 * every surface whose compact card has no room for the full description,
 * photo set, and vendor-entered attributes (the public store page, the
 * homepage marketplace preview). Renders as a slide-up bottom sheet below
 * the `sm` breakpoint and a centered dialog above it. The chat CTA sits in
 * its own non-scrolling footer so it's always visible regardless of how much
 * detail is above it. */
export function ListingDetailModal({
  item,
  open,
  onClose,
  isOwn,
  chatHref,
  chatLabel,
  onChatClick,
}: {
  item: ListingDetailItem;
  open: boolean;
  onClose: () => void;
  isOwn: boolean;
  chatHref: string | null;
  chatLabel: string;
  onChatClick: () => void;
}) {
  const isService = item.kind === "service";
  const KindIcon = isService ? Wrench : Package;
  const symbol = item.currency === "USD" ? "$" : "₦";
  const price = item.price / 100;
  const priceMax = item.priceMax != null ? item.priceMax / 100 : null;
  const isRange = priceMax != null && priceMax > price;

  const [imgIndex, setImgIndex] = useState(0);
  const hasGallery = item.images.length > 1;

  const showPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImgIndex((i) => (i - 1 + item.images.length) % item.images.length);
  };
  const showNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImgIndex((i) => (i + 1) % item.images.length);
  };

  // Auto-advance the gallery while it's open — only when there's more than
  // one photo, obviously. Depending on `imgIndex` itself (not just `open`)
  // means every advance — auto OR a manual prev/next click — restarts the
  // dwell timer, so a manual click always gets a full AUTO_SLIDE_MS before
  // the next auto-advance instead of whatever was left of the prior cycle.
  const AUTO_SLIDE_MS = 4000;
  useEffect(() => {
    if (!open || !hasGallery) return;
    const id = setInterval(() => {
      setImgIndex((i) => (i + 1) % item.images.length);
    }, AUTO_SLIDE_MS);
    return () => clearInterval(id);
  }, [open, hasGallery, item.images.length, imgIndex]);

  // Mirrors the `sm:` breakpoint the panel's own layout classes below switch
  // on (rounded-t-2xl full-width vs. a centered rounded-2xl card) — the two
  // need to agree, since this also picks which motion variant animates in.
  const isDesktop = useMediaQuery("(min-width: 640px)");

  // Swipe-down-to-dismiss, mobile sheet only. `dragListener={false}` +
  // manually starting the drag from the handle's own onPointerDown (rather
  // than making the whole panel a drag target) is the standard motion
  // pattern for this — it keeps the drag gesture from fighting the
  // scrollable content or the carousel's tap targets, since only the handle
  // itself can ever initiate one.
  const dragControls = useDragControls();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  // Reset to the first photo on each fresh open — React's own documented
  // "adjusting state when a prop changes" pattern (a render-phase setState
  // guarded by comparing against last render's value in state, not a ref —
  // refs can't be read/written during render), not an effect, so reopening
  // doesn't cost an extra commit+paint before the reset takes effect.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setImgIndex(0);
  }

  // Rendered unconditionally (not `if (!open) return null`) so AnimatePresence
  // gets to play the exit transition before the panel actually unmounts —
  // an early return here would make closing instant instead of animated.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="listing-detail-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          // Mobile: a fixed, non-scrolling flex-centered overlay — the sheet
          // itself owns its own bounded height + internal scroll below.
          // Desktop: `sm:block sm:overflow-y-auto` turns the overlay INTO
          // the scroll surface instead — tall content scrolls the same way
          // the page itself would (this is the actual viewport-covering
          // element, not a boxed-in scrollbar squeezed inside the dialog),
          // so the dialog card itself never needs its own internal scroll.
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:block sm:overflow-y-auto sm:p-4"
          onClick={onClose}
        >
          <motion.div
            key="listing-detail-panel"
            drag={isDesktop ? false : "y"}
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            // bottom: 1 — no rubber-band resistance past the constraint, so
            // the sheet tracks the finger exactly (1:1) instead of visually
            // lagging/stalling the further down it's dragged. top: 0 keeps
            // it rigid against dragging up past its resting position (it's
            // already fully expanded — nothing to reveal above). Release
            // still auto-springs back to y:0 within these constraints
            // unless onDragEnd below decides to close it instead.
            dragElastic={{ top: 0, bottom: 1 }}
            onDragEnd={(_, info) => {
              // A real flick down, or dragged more than a third of the way
              // off — either reads as "let go of this", not "snap back".
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
            initial={
              isDesktop ? { opacity: 0, scale: 0.96, y: 16 } : { y: "100%" }
            }
            animate={isDesktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
            exit={
              isDesktop ? { opacity: 0, scale: 0.96, y: 16 } : { y: "100%" }
            }
            transition={isDesktop ? DIALOG_TRANSITION : SHEET_TRANSITION}
            // Mobile keeps a capped height (max-h-[92vh]) with its own
            // internal scroll below. Desktop drops the cap (sm:max-h-none)
            // and centers via margin instead of the old flex-centering
            // (sm:mx-auto sm:my-10) now that the backdrop itself scrolls —
            // the card just grows to its natural content height and the
            // backdrop's own scroll (see above) reveals whatever doesn't
            // fit the viewport, exactly like scrolling the page.
            className="flex w-full flex-col bg-white sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[92vh] sm:max-h-none sm:my-10 sm:mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab handle — the one place a drag can start (see
                dragListener/dragControls above), so dragging never fights
                the scrollable content or the carousel's own tap targets
                below. Dragging it down past the threshold above closes the
                sheet the same way the X button/tap-outside/Escape do. */}
            <div
              className="flex justify-center pt-2.5 pb-1 sm:hidden shrink-0 touch-none cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <span className="h-1 w-10 rounded-full bg-gray-300" />
            </div>

            {/* flex-1/overflow-y-auto only actually do anything on mobile,
                where the panel above has a real max-height to be bounded
                by — sm:flex-none/sm:overflow-visible makes that explicit
                for desktop rather than leaving it as an implicit side
                effect of the panel's own sm:max-h-none. */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain sm:flex-none sm:overflow-visible">
              <div className="relative">
                <div className="relative w-full aspect-[4/3] bg-gray-50 flex items-center justify-center overflow-hidden">
                  {item.images.length > 0 ? (
                    <ProtectedImage
                      src={optimizedImageUrl(item.images[imgIndex])}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <StoreIcon size={30} className="text-gray-300" />
                  )}
                  {hasGallery && (
                    <>
                      <button
                        type="button"
                        onClick={showPrev}
                        aria-label="Previous photo"
                        className="absolute left-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white"
                      >
                        <ChevronLeft size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={showNext}
                        aria-label="Next photo"
                        className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white"
                      >
                        <ChevronRight size={15} />
                      </button>
                      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1">
                        {item.images.map((url, i) => (
                          <span
                            key={url}
                            className={cn(
                              "h-1.5 w-1.5 rounded-full transition-colors",
                              i === imgIndex ? "bg-white" : "bg-white/50",
                            )}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
                {/* Solid white + shadow + ring, not the translucent-black
                    treatment the carousel/kind-badge overlays use — this is
                    the one control on the whole sheet/modal that MUST read
                    as "the way out" at a glance, even over a bright photo
                    where a dark translucent circle would blend in. */}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-900 shadow-lg ring-1 ring-black/10 transition-transform hover:scale-105 active:scale-95"
                >
                  <X size={20} strokeWidth={2.5} />
                </button>
                <span className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-1 bg-black/50 backdrop-blur-sm text-white text-[11px] font-semibold rounded-full">
                  <KindIcon size={11} />
                  {isService ? "Service" : "Product"}
                </span>
              </div>

              <div className="p-4 sm:p-5 space-y-3">
                <p className="text-base font-bold text-gray-800 leading-snug">
                  {item.name}
                </p>
                {item.description && (
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                    {item.description}
                  </p>
                )}
                {item.attributes.length > 0 && (
                  <dl className="space-y-1.5 pt-2 border-t border-gray-100">
                    {item.attributes.map((attr) => (
                      <div
                        key={attr.name}
                        className="flex items-baseline gap-1.5 text-sm"
                      >
                        <dt className="text-gray-400 shrink-0">{attr.name}:</dt>
                        <dd className="text-gray-700">{attr.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                <div className="pt-2 border-t border-gray-100">
                  {item.quoteOnRequest ? (
                    <p className="text-[15px] font-extrabold text-[#023337]">
                      Contact for quote
                    </p>
                  ) : (
                    <p className="text-[15px] font-extrabold text-[#023337]">
                      {fmt(price, symbol)}
                      {isRange && (
                        <>
                          <span className="mx-1 text-sm font-normal text-gray-400">
                            –
                          </span>
                          {fmt(priceMax!, symbol)}
                        </>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Chat/Enquire. Mobile: a shrink-0 flex footer outside the
                sheet's own bounded scroll area above, so it stays on screen
                no matter how long the description/attribute list gets —
                safe-area padding clears the home-indicator strip on notched
                phones. Desktop: the card has no bounded scroll area of its
                own anymore (see above), so sm:sticky sm:bottom-0 does the
                equivalent job against the backdrop's scroll instead —
                stays glued to the viewport's bottom edge while the page
                scrolls, rather than becoming unreachable at the bottom of a
                long card. */}
            <div className="shrink-0 border-t border-gray-100 bg-white p-4 sm:p-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:pb-5 sm:sticky sm:bottom-0">
              {isOwn ? (
                <OwnListingBadge label="This is your listing" />
              ) : (
                chatHref && (
                  <WhatsAppButton
                    href={chatHref}
                    label={chatLabel}
                    className="w-full"
                    onClick={onChatClick}
                  />
                )
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
