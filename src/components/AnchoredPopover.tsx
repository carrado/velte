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
    top: number;
    left?: number;
    right?: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const anchor = anchorEl ?? anchorRef?.current ?? null;
      const a = anchor?.getBoundingClientRect();
      if (!a) return;
      const top = a.bottom + gap;
      // "auto" starts left-aligned (opening rightward, the common case) —
      // the effect below corrects it to right-aligned once the panel is
      // actually mounted and its real width is known.
      setPos(
        align === "right"
          ? { top, right: window.innerWidth - a.right }
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

  // "auto" only: once the panel is in the DOM (pos set → rendered below),
  // measure its real width and flip to right-aligned if opening rightward
  // would overflow the viewport — runs in a layout effect (before paint),
  // so there's no visible flicker. Only ever flips left-aligned → right;
  // `pos.left === undefined` (already flipped) short-circuits re-checking,
  // which is what keeps this from looping.
  useLayoutEffect(() => {
    if (!open || align !== "auto" || !pos || pos.left === undefined) return;
    const anchor = anchorEl ?? anchorRef?.current ?? null;
    const panel = panelRef.current;
    if (!anchor || !panel) return;
    const panelWidth = panel.getBoundingClientRect().width;
    const a = anchor.getBoundingClientRect();
    const overflowsRight = pos.left + panelWidth > window.innerWidth - 8;
    if (overflowsRight) {
      // Deliberate measure-then-correct: this can only run once the panel's
      // real (just-committed) width is known, so it can't be folded into
      // the initial position effect above — same one-time layout-correction
      // pattern Radix/Floating UI use internally, just without the library.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPos({ top: pos.top, right: window.innerWidth - a.right });
    }
  }, [open, align, pos, anchorRef, anchorEl]);

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
