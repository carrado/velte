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
  /** Horizontal edge of the panel to align with the trigger. Default "left". */
  align?: "left" | "right";
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
