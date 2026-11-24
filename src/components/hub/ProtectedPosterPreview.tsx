"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { CloseIcon } from "@/components/icons";
import { modalScrimClass } from "@/lib/modalScrim";
import { cn } from "@/lib/utils";

// In-memory blob cache: allows the lightbox to instantly reuse the image
// already fetched by the feed card thumbnail without making a second network request.
const posterBlobCache = new Map<string, Blob>();
// In-flight request deduplication: prevents multiple simultaneous requests for the same asset
const inFlightRequests = new Map<string, Promise<Blob>>();

interface BatchQueueItem {
  ref: string;
  resolve: (blob: Blob) => void;
  reject: (err: unknown) => void;
}

let batchQueue: BatchQueueItem[] = [];
let batchTimeout: NodeJS.Timeout | null = null;

async function flushBatchQueue() {
  const currentBatch = [...batchQueue];
  batchQueue = [];
  batchTimeout = null;

  if (currentBatch.length === 0) return;

  const refs = Array.from(new Set(currentBatch.map((item) => item.ref)));

  try {
    const res = await fetch("/api/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refs }),
    });

    if (!res.ok) throw new Error("Batch fetch failed");
    const json = await res.json();
    const items = json.items || {};

    for (const item of currentBatch) {
      const result = items[item.ref];
      if (result && result.data) {
        // Decode base64 bytes
        const binaryStr = atob(result.data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        // Unmask the byte stream in memory using SHA-256 of ref
        const refBytes = new TextEncoder().encode(item.ref);
        const hashBuffer = await crypto.subtle.digest("SHA-256", refBytes);
        const mask = new Uint8Array(hashBuffer);
        const headerLen = Math.min(bytes.length, 64);
        for (let i = 0; i < headerLen; i++) {
          bytes[i] ^= mask[i % mask.length];
        }

        const blob = new Blob([bytes], { type: result.mime || "image/jpeg" });
        posterBlobCache.set(item.ref, blob);
        item.resolve(blob);
      } else {
        item.reject(new Error(result?.error || "Asset failed in batch"));
      }
    }
  } catch (err) {
    for (const item of currentBatch) {
      item.reject(err);
    }
  }
}

export function extractMediaRef(src: string): string | null {
  if (!src) return null;
  const s = src.trim();
  if (s.startsWith("data:") || s.startsWith("blob:")) return null;

  // Cloudinary direct URL (uploaded by user)
  if (s.includes("cloudinary.com")) {
    return s;
  }

  // API media proxy URL (relative or absolute, e.g. /api/media?ref=... or http://.../api/media?ref=...)
  if (
    s.includes("/api/media") ||
    s.includes("/api/hub/media") ||
    s.includes("/api/hub/e/")
  ) {
    try {
      const url = new URL(s, "http://localhost:4001");
      const refParam =
        url.searchParams.get("ref") ||
        url.searchParams.get("url") ||
        url.searchParams.get("src") ||
        url.searchParams.get("token");
      if (refParam) return refParam;

      const parts = url.pathname.split("/").filter(Boolean);
      const last = parts[parts.length - 1];
      if (last && last !== "media" && last !== "e") return last;
    } catch {
      // fallback if URL constructor fails
    }
  }

  // Raw encrypted token (no http, no slash)
  if (
    !s.startsWith("http://") &&
    !s.startsWith("https://") &&
    !s.startsWith("/")
  ) {
    return s;
  }

  return null;
}

function queueBatchRef(ref: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    batchQueue.push({ ref, resolve, reject });
    if (!batchTimeout) {
      // 20ms debounce window collects all cards rendered in this viewport frame
      batchTimeout = setTimeout(flushBatchQueue, 20);
    }
  });
}

export async function fetchProtectedMediaBlob(src: string): Promise<Blob> {
  const cached = posterBlobCache.get(src);
  if (cached) return cached;

  const inFlight = inFlightRequests.get(src);
  if (inFlight) return inFlight;

  const promise = (async () => {
    try {
      const mediaRef = extractMediaRef(src);
      let blob: Blob;

      if (mediaRef) {
        // Send media ref via batch queue (batches multiple visible cards into 1 single POST /api/media request!)
        blob = await queueBatchRef(mediaRef);
      } else {
        // Direct URL or local static asset from /public
        const res = await fetch(src);
        if (!res.ok) throw new Error("direct fetch failed");
        blob = await res.blob();
      }

      posterBlobCache.set(src, blob);
      return blob;
    } finally {
      inFlightRequests.delete(src);
    }
  })();

  inFlightRequests.set(src, promise);
  return promise;
}

export function drawFitted(
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
  const [isVisible, setIsVisible] = useState(false);
  const labelId = useId();
  const clickable = typeof onClick === "function";

  // 1. Viewport observer: only request media when the card enters (or is close to) the viewport
  useEffect(() => {
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
      { rootMargin: "250px" }, // Pre-load 250px before entering viewport for smooth scrolling
    );

    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  // 2. Load & render only once the card is visible in the viewport
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
      drawFitted(ctx, bitmap, cw, ch, fit);
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
      ro.disconnect();
      bitmapRef.current?.close();
      bitmapRef.current = null;
    };
  }, [isVisible, src, fit]);

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
