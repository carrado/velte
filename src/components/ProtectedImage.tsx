"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type MouseEventHandler,
} from "react";
import { cn } from "@/lib/utils";
import {
  fetchProtectedMediaBlob,
  drawFitted,
} from "@/components/hub/ProtectedPosterPreview";

export interface ProtectedImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  style?: CSSProperties;
  fit?: "cover" | "contain";
  priority?: boolean;
  onClick?: MouseEventHandler<HTMLDivElement>;
  draggable?: boolean;
  width?: number | string;
  height?: number | string;
}

/**
 * Universal Protected Image Component for Velte.
 * Cuts across the entire application for all user-uploaded images (products, store assets,
 * avatars, adverts, gigs, marketplace preview, cart).
 *
 * Features:
 *  - Canvas-based rendering: prevents right-click "Save As", drag-to-desktop, and DevTools image extraction.
 *  - Viewport-Only Loading: IntersectionObserver triggers download only when the image enters or approaches viewport.
 *  - Single-Batch Network Dispatch: batches visible images into ONE /api/media call instead of N parallel calls.
 *  - In-memory XOR unmasking: DevTools network tab preview is blocked.
 *  - Responsive & DPR-aware: sharp canvas painting on high-DPI (Retina) screens.
 */
export function ProtectedImage({
  src,
  alt,
  className,
  style,
  fit,
  priority = false,
  onClick,
  width,
  height,
}: ProtectedImageProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bitmapRef = useRef<ImageBitmap | null>(null);
  const labelId = useId();
  const [isVisible, setIsVisible] = useState(priority);
  const clickable = typeof onClick === "function";

  const fitMode: "cover" | "contain" =
    fit || (className?.includes("object-contain") ? "contain" : "cover");

  // 1. Viewport observer: only load when approaching or in viewport
  useEffect(() => {
    if (priority || isVisible) return;
    const wrap = wrapRef.current;
    if (!wrap) return;

    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "250px" },
    );

    observer.observe(wrap);
    return () => observer.disconnect();
  }, [priority, isVisible]);

  // 2. Fetch and render onto protected canvas
  useEffect(() => {
    if (!isVisible || !src) return;
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    let cancelled = false;

    const paint = () => {
      const bitmap = bitmapRef.current;
      const ctx = canvas.getContext("2d");
      if (!bitmap || !ctx) return;
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = Math.max(1, Math.round(rect.width * dpr));
      const ch = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }
      drawFitted(ctx, bitmap, cw, ch, fitMode);
    };

    (async () => {
      try {
        const blob = await fetchProtectedMediaBlob(src);
        if (cancelled) return;
        const bitmap = await createImageBitmap(blob);
        if (cancelled) {
          bitmap.close();
          return;
        }
        bitmapRef.current?.close();
        bitmapRef.current = bitmap;
        paint();
      } catch {
        if (!cancelled) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            canvas.width = 4;
            canvas.height = 4;
            ctx.fillStyle = "#f3f4f6";
            ctx.fillRect(0, 0, 4, 4);
          }
        }
      }
    })();

    const ro = new ResizeObserver(() => paint());
    ro.observe(wrap);

    return () => {
      cancelled = true;
      ro.disconnect();
      bitmapRef.current?.close();
      bitmapRef.current = null;
    };
  }, [isVisible, src, fitMode]);

  return (
    <div
      ref={wrapRef}
      role={clickable ? "button" : "img"}
      aria-label={alt}
      aria-labelledby={alt ? undefined : labelId}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onClick : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>);
              }
            }
          : undefined
      }
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      style={{
        ...style,
        ...(width ? { width } : {}),
        ...(height ? { height } : {}),
      }}
      className={cn(
        "relative overflow-hidden select-none inline-block [-webkit-touch-callout:none] [-webkit-user-drag:none]",
        clickable && "cursor-pointer",
        className,
      )}
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full block"
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}
