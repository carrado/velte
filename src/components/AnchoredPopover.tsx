"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface AnchoredPopoverProps {
  open: boolean;
  onClose: () => void;
  /** The trigger to anchor to — pass a ref (stable trigger) OR an element
      (e.g. inside a list where a single ref won't do). One of the two. */
  anchorRef?: RefObject<HTMLElement | null>;
  anchorEl?: HTMLElement | null;
  /** Horizontal edge of the panel to align with the trigger. Default "left".
      "auto" opens left-aligned (rightward) like "left", but flips to
      right-aligned (leftward) if that would overflow the viewport's right
      edge — for a trigger whose position varies (e.g. a grid of cards)
      where a fixed side is wrong for roughly half of them. */
  align?: "left" | "right" | "auto";
  /** Gap in px between the trigger and the panel. */
  gap?: number;
  className?: string;
  children: ReactNode;
}

/**
 * Renders `children` in a portal on `document.body`, positioned (fixed) just
 * below the anchor. This escapes any `overflow-hidden` / `overflow-x-auto`
 * ancestor (cards, scrollable tables) that would otherwise clip an absolutely
 * positioned dropdown — the reason in-table and toolbar menus were "swallowed".
 */
export default function AnchoredPopover({
  open,
  onClose,
  anchorRef,
  anchorEl,
  align = "left",
  gap = 6,
  className,
  children,
}: AnchoredPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  } | null>(null);
  // Guards the correction effect below to run once per fresh guess rather
  // than on every render — reset alongside every setPos call in `update()`,
  // below, so a scroll/resize that moves the anchor gets re-corrected too.
  const correctedRef = useRef(false);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const anchor = anchorEl ?? anchorRef?.current ?? null;
      const a = anchor?.getBoundingClientRect();
      if (!a) return;
      const top = a.bottom + gap;
      correctedRef.current = false;
      // "auto" starts left-aligned (opening rightward, the common case) —
      // the effect below corrects it to right-aligned once the panel is
      // actually mounted and its real width is known.
      //
      // `right` is clamped to a minimum of 8px — a trigger sitting flush
      // against (or, via sub-pixel rounding, fractionally past) the
      // viewport's right edge makes `window.innerWidth - a.right` zero or
      // NEGATIVE. A negative CSS `right` pushes the panel even further off
      // the right edge instead of clamping it on-screen — found live: a
      // "..." menu whose trigger sits right at a mobile row's edge rendered
      // fully off-screen because of this. Same fix applied below where this
      // formula is used again for the auto-flip correction.
      setPos(
        align === "right"
          ? { top, right: Math.max(8, window.innerWidth - a.right) }
          : { top, left: a.left },
      );
    };
    update();
    // Capture phase catches scrolling inside nested scroll containers too.
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, align, gap, anchorRef, anchorEl]);

  // Once the panel is in the DOM (pos set → rendered below) and its real
  // size is known, corrects BOTH axes together in a single pass and a
  // single setPos call — horizontal (align="auto" only: flip right-aligned
  // if opening rightward would overflow the viewport) and vertical (all
  // alignments: flip to open ABOVE the anchor if opening below would
  // overflow the bottom AND there's actually room above — otherwise a flip
  // could land it somewhere worse than just letting it run off the bottom).
  //
  // Deliberately ONE effect, not two independent ones: this component used
  // to run the horizontal and vertical corrections as separate effects,
  // each reading and spreading the same `pos` state. When a trigger needed
  // BOTH corrections at once (found live: a "..." menu near the
  // bottom-right of a mobile screen — the last row in a list, `align="auto"`)
  // both effects fired in the same commit off the same stale `pos` snapshot,
  // and whichever ran second overwrote the first's correction — the panel
  // ended up positioned using the ORIGINAL unflipped horizontal position
  // (already overflowing) combined with the new vertical one, pushed
  // effectively off-screen. Computing both corrections from freshly-measured
  // rects in one pass and applying them in one setPos call removes the race
  // entirely. `correctedRef` (reset in `update()` above) makes this run once
  // per fresh position guess rather than looping.
  useLayoutEffect(() => {
    if (!open || !pos || correctedRef.current) return;
    const anchor = anchorEl ?? anchorRef?.current ?? null;
    const panel = panelRef.current;
    if (!anchor || !panel) return;
    const a = anchor.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();

    const next: typeof pos = { ...pos };
    let changed = false;

    if (align === "auto" && next.left !== undefined) {
      const overflowsRight =
        next.left + panelRect.width > window.innerWidth - 8;
      if (overflowsRight) {
        delete next.left;
        next.right = Math.max(8, window.innerWidth - a.right);
        changed = true;
      }
    }

    if (next.top !== undefined) {
      const overflowsBottom =
        next.top + panelRect.height > window.innerHeight - 8;
      const fitsAbove = a.top - panelRect.height - gap >= 8;
      if (overflowsBottom && fitsAbove) {
        delete next.top;
        next.bottom = window.innerHeight - a.top + gap;
        changed = true;
      }
    }

    correctedRef.current = true;
    if (changed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPos(next);
    }
  }, [open, align, pos, gap, anchorRef, anchorEl]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const t = e.target as Node;
      const anchor = anchorEl ?? anchorRef?.current ?? null;
      if (panelRef.current?.contains(t) || anchor?.contains(t)) {
        return;
      }
      // Ignore clicks inside nested Radix poppers (Select/Tooltip/etc. portal
      // their content elsewhere on the body) so they don't close this panel.
      const el = t instanceof Element ? t : t.parentElement;
      if (el?.closest("[data-radix-popper-content-wrapper]")) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, anchorRef, anchorEl]);

  if (!open || typeof document === "undefined" || !pos) return null;

  return createPortal(
    <div
      ref={panelRef}
      data-anchored-popover-panel=""
      // Stops the native pointerdown/mousedown from ever reaching document —
      // this panel is portaled straight to document.body, so it sits OUTSIDE
      // the DOM of any Base UI/Radix-style popover it's visually nested
      // inside (e.g. NotificationDropdown's bell popover). Those libraries
      // detect "outside" clicks with their own native document-level
      // listener, checking real DOM containment — no amount of React-tree
      // nesting or onOpenChange/eventDetails.cancel() filtering on the
      // CONSUMER side changes that, since their listener fires (and decides
      // to close) before that callback even runs. Stopping propagation here,
      // at the source, is the only place that reliably prevents it — this
      // fixes the same problem for every ancestor popover, not just one.
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        top: pos.top,
        bottom: pos.bottom,
        left: pos.left,
        right: pos.right,
      }}
      className={cn("z-[100]", className)}
    >
      {children}
    </div>,
    document.body,
  );
}
