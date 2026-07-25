"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { getVideoStatus } from "@/lib/bunnyStream";

interface FullscreenVideoModalProps {
  videoUrl: string;
  open: boolean;
  onClose: () => void;
  // Only ever passed when opened from a search result (build-order step d/e)
  // — a vendor viewing their OWN listing in the dashboard has no one to chat
  // with, so ViewProductPage never sets this.
  whatsapp?: { href: string; label: string } | null;
}

const POLL_MS = 2000;
// Fail open past this point rather than block forever — a genuinely stuck
// Bunny transcode (or our status route having an issue) shouldn't leave the
// vendor staring at a progress bar with no way to even try playing it.
const MAX_WAIT_MS = 3 * 60 * 1000;

export default function FullscreenVideoModal({
  videoUrl,
  open,
  onClose,
  whatsapp,
}: FullscreenVideoModalProps) {
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // Prevents the page behind the modal from scrolling while it's open —
    // there's nothing else on screen to interact with anyway.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  // Checks Bunny's transcode status on open and, if it's not finished yet,
  // polls until it is (or MAX_WAIT_MS passes) instead of handing the vendor
  // straight to Bunny's own embed player mid-"not ready" state.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(false);
    setProgress(0);
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const startedAt = Date.now();

    const poll = async () => {
      const status = await getVideoStatus(videoUrl);
      if (cancelled) return;
      // null (status check itself failed) or ready — either way, stop
      // gating on our own progress UI and let the player take over.
      if (!status || status.ready || Date.now() - startedAt > MAX_WAIT_MS) {
        setReady(true);
        return;
      }
      setProgress(status.progress);
      timer = setTimeout(poll, POLL_MS);
    };
    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [open, videoUrl]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black">
      <button
        onClick={onClose}
        aria-label="Close video"
        className="absolute right-4 top-[calc(env(safe-area-inset-top)+1rem)] z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
      >
        <X size={20} />
      </button>

      {ready ? (
        // Bunny Stream's own embed player — handles HLS/adaptive bitrate
        // and codec selection, so there's no client-side video/HLS logic
        // to maintain here. Only mounted once we know transcoding is done
        // (or our own status check gave up), so it never has to show its
        // own "not ready" state.
        <iframe
          src={`${videoUrl}?autoplay=true`}
          allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
          allowFullScreen
          className="aspect-video w-full max-w-4xl border-0"
        />
      ) : (
        <div className="flex flex-col items-center gap-3 text-white">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-dash-body font-medium">
            Processing your video… {progress}%
          </p>
          <p className="text-dash-caption text-white/60">
            This usually takes less than a minute
          </p>
        </div>
      )}

      {whatsapp && (
        <WhatsAppButton
          href={whatsapp.href}
          label={whatsapp.label}
          className="absolute bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] left-1/2 z-10 -translate-x-1/2 shadow-lg"
        />
      )}
    </div>,
    document.body,
  );
}
