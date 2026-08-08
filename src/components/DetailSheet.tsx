"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useDragControls } from "motion/react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

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

/** The portal/backdrop/drag-to-dismiss/ESC/scroll-lock shell shared by every
 * buyer-facing "See more" detail view — originally ListingDetailModal's own
 * shell, extracted here once VendorDetailModal needed the identical
 * mechanics for a vendor/store match, so the two stay in sync automatically
 * instead of drifting apart. Callers own everything content-shaped
 * (gallery/close button/kind badge, body text, footer CTAs) via `children`
 * (the scrollable body) and `footer` (the non-scrolling bottom bar) — this
 * component only knows how to open, close, and animate the panel around
 * them. Renders as a slide-up bottom sheet below the `sm` breakpoint and a
 * centered dialog above it. */
export function DetailSheet({
  open,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  // Mirrors the `sm:` breakpoint the panel's own layout classes below switch
  // on — the two need to agree, since this also picks which motion variant
  // animates in.
  const isDesktop = useMediaQuery("(min-width: 640px)");

  // Swipe-down-to-dismiss, mobile sheet only. `dragListener={false}` +
  // manually starting the drag from the handle's own onPointerDown (rather
  // than making the whole panel a drag target) is the standard motion
  // pattern for this — it keeps the drag gesture from fighting the
  // scrollable content or any tap targets inside `children`, since only the
  // handle itself can ever initiate one.
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

  // `document` doesn't exist during SSR (Node has no DOM at all, not just an
  // empty one) — createPortal's second argument is a plain expression
  // evaluated at call time, so `document.body` throws `ReferenceError:
  // document is not defined` immediately server-side, before React even
  // gets to see that `open` is false. Same guard AnchoredPopover.tsx already
  // uses for the identical reason. Safe to bail before AnimatePresence too:
  // every caller starts `open` false, so there's never a real exit
  // animation in flight on the very first (server) render this skips.
  if (typeof document === "undefined") return null;

  // Rendered unconditionally past this point (not `if (!open) return null`)
  // so AnimatePresence gets to play the exit transition before the panel
  // actually unmounts — an early return here would make closing instant
  // instead of animated.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="detail-sheet-backdrop"
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
            key="detail-sheet-panel"
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
            // now that the backdrop itself scrolls — the card just grows to
            // its natural content height and the backdrop's own scroll (see
            // above) reveals whatever doesn't fit the viewport, exactly
            // like scrolling the page.
            className="flex w-full flex-col bg-white sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[92vh] sm:max-h-none sm:my-10 sm:mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab handle — the one place a drag can start (see
                dragListener/dragControls above), so dragging never fights
                the scrollable content or any tap targets inside `children`.
                Dragging it down past the threshold above closes the sheet
                the same way the X button/tap-outside/Escape do. */}
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
              {children}
            </div>

            {/* Non-scrolling footer. Mobile: a shrink-0 flex row outside the
                sheet's own bounded scroll area above, so it stays on screen
                no matter how long the content gets — safe-area padding
                clears the home-indicator strip on notched phones. Desktop:
                the card has no bounded scroll area of its own anymore (see
                above), so sm:sticky sm:bottom-0 does the equivalent job
                against the backdrop's scroll instead — stays glued to the
                viewport's bottom edge while the page scrolls, rather than
                becoming unreachable at the bottom of a long card. */}
            <div className="shrink-0 border-t border-gray-100 bg-white p-4 sm:p-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:pb-5 sm:sticky sm:bottom-0">
              {footer}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
