"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

import { CloseIcon } from "@/components/icons";
import { modalScrimClass } from "@/lib/modalScrim";
import { cn } from "@/lib/utils";

function drawFitted(
  ctx: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  cw: number,
  ch: number,
  fit: "cover" | "contain",
) {
  const scale =
    fit === "contain"
      ? Math.min(cw / bitmap.width, ch / bitmap.height)
      : Math.max(cw / bitmap.width, ch / bitmap.height);
  const dw = bitmap.width * scale;
  const dh = bitmap.height * scale;
  const dx = (cw - dw) / 2;
  const dy = (ch - dh) / 2;
  ctx.clearRect(0, 0, cw, ch);
  ctx.drawImage(bitmap, dx, dy, dw, dh);
}

/**
 * Renders a poster preview on a <canvas> so there is no <img src> to
 * open-in-new-tab or Save As. Blocks context menu and drag. Casual barrier
 * only — screenshots / network traces can still capture pixels.
 */
export function ProtectedPosterPreview({
  src,
  className,
  fit = "cover",
  onClick,
}: {
  src: string;
  className?: string;
  /** `cover` crops to fill (thumbnails). `contain` shows the full poster. */
  fit?: "cover" | "contain";
  /** When set, the preview is clickable (cursor-pointer). */
  onClick?: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bitmapRef = useRef<ImageBitmap | null>(null);
  const labelId = useId();
  const clickable = typeof onClick === "function";

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas || !src) return;

    let cancelled = false;
    const ctrl = new AbortController();

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
      drawFitted(ctx, bitmap, cw, ch, fit);
    };

    (async () => {
      try {
        const res = await fetch(src, {
          mode: "cors",
          credentials: "omit",
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error("preview fetch failed");
        const blob = await res.blob();
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
            ctx.fillStyle = "#262e38";
            ctx.fillRect(0, 0, 4, 4);
          }
        }
      }
    })();

    const ro = new ResizeObserver(() => paint());
    ro.observe(wrap);

    return () => {
      cancelled = true;
      ctrl.abort();
      ro.disconnect();
      bitmapRef.current?.close();
      bitmapRef.current = null;
    };
  }, [src, fit]);

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative overflow-hidden select-none [-webkit-user-drag:none]",
        clickable && "cursor-pointer",
        className,
      )}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      onClick={clickable ? onClick : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={clickable ? "button" : "img"}
      tabIndex={clickable ? 0 : undefined}
      aria-labelledby={labelId}
    >
      <span id={labelId} className="sr-only">
        {clickable ? "View advert poster full size" : "Advert poster preview"}
      </span>
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      <div
        aria-hidden
        className="absolute inset-0"
        onContextMenu={(e) => e.preventDefault()}
        style={{ pointerEvents: "none" }}
      />
    </div>
  );
}

/** Full-viewport lightbox — poster shown exactly (contain), protected canvas. */
export function PosterPreviewLightbox({
  src,
  onClose,
}: {
  src: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Advert poster"
      className={cn(
        "fixed inset-0 z-[80] flex h-dvh w-dvw items-center justify-center p-3 sm:p-6",
        modalScrimClass(),
      )}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-3 right-3 z-[1] rounded-full bg-black/50 p-2 text-white hover:bg-black/70 sm:top-5 sm:right-5"
      >
        <CloseIcon size={20} />
      </button>
      <div
        className="relative h-full w-full max-h-[min(92dvh,920px)] max-w-[min(96vw,1100px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <ProtectedPosterPreview
          src={src}
          fit="contain"
          className="h-full w-full rounded-lg bg-black/20"
        />
      </div>
    </div>,
    document.body,
  );
}
