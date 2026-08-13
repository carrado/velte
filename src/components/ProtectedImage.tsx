"use client";

import type { ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// Drop-in replacement for a plain <img> that discourages casual "Save image
// as…", "Open image in new tab", drag-to-desktop, and mobile long-press-to-
// save on vendor/product/store photos: blocks the right-click context menu,
// disables native drag, and -webkit-touch-callout suppresses iOS Safari's
// long-press save/copy menu.
//
// This is a DETERRENT, not real protection — nothing client-side can fully
// stop someone determined (the browser's Network tab, a screenshot,
// disabling JavaScript). It only removes the casual one-tap/right-click
// path most people would actually use, which is what was actually asked
// for.
//
// Used only on PUBLIC-facing vendor/product photography — search results,
// the "/" homepage's marketplace/vendor sections, the public /store/[handle]
// page. The vendor dashboard's own image displays (ProductsTable,
// ViewProductPage, the store editor) are deliberately untouched — that's a
// vendor looking at their own uploaded content, not a stranger copying it,
// so there's nothing to deter there.
//
// `alt` is required (unlike plain ImgHTMLAttributes, where it's optional) —
// every real call site already passes one, and making it required here is
// what lets jsx-a11y's alt-text rule actually verify that at each usage
// instead of only seeing this component's own permissive signature.
export function ProtectedImage({
  className,
  alt,
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & { alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      alt={alt}
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      className={cn(
        "select-none [-webkit-touch-callout:none] [-webkit-user-drag:none]",
        className,
      )}
    />
  );
}
