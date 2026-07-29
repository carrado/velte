"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Loader2, Pause, Play, Scissors, X } from "lucide-react";
import type { VideoTrimModalProps } from "@/types/product";

// Same reasoning as checkVideoDuration in bunnyStream.ts: a desktop/mobile
// browser's <video> metadata read can hang indefinitely on a large file
// (moov atom at the end of the container, needing to be streamed-through
// first) or on a codec it can't decode at all (HEVC on a lot of Android
// Chrome builds) — without this, that shows as an infinite "Reading
// video…" spinner with no way out. In practice this modal only opens once
// AddProductPage's own pre-check already confirmed the browser CAN preview
// this file (see checkVideoDuration's "trim-with-preview" case), so this
// fallback is now a rare defensive backstop rather than the common path —
// letting the vendor type a start/end instead of dragging a scrubber they
// can't see a preview for.
const METADATA_TIMEOUT_MS = 8000;

function formatTime(s: number): string {
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Dual-handle range — HTML has no native two-thumb slider. Pointer capture
// on each thumb means drags keep tracking correctly even once the cursor
// leaves the track (fast drags, small track on mobile).
function TrimScrubber({
  duration,
  start,
  end,
  maxWindow,
  onChange,
}: {
  duration: number;
  start: number;
  end: number;
  maxWindow: number;
  onChange: (start: number, end: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<"start" | "end" | null>(null);

  const timeAtClientX = (clientX: number) => {
    const track = trackRef.current;
    if (!track || duration <= 0) return 0;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return ratio * duration;
  };

  const beginDrag =
    (which: "start" | "end") => (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      draggingRef.current = which;
      e.currentTarget.setPointerCapture(e.pointerId);
    };

  const handleMove = (e: React.PointerEvent) => {
    const which = draggingRef.current;
    if (!which) return;
    const t = timeAtClientX(e.clientX);
    if (which === "start") {
      const newStart = Math.min(t, end - 1);
      onChange(Math.max(0, Math.max(newStart, end - maxWindow)), end);
    } else {
      const newEnd = Math.max(t, start + 1);
      onChange(start, Math.min(duration, Math.min(newEnd, start + maxWindow)));
    }
  };

  const endDrag = () => {
    draggingRef.current = null;
  };

  const startPct = duration ? (start / duration) * 100 : 0;
  const endPct = duration ? (end / duration) * 100 : 100;

  return (
    <div
      ref={trackRef}
      className="relative h-2 bg-gray-200 rounded-full select-none touch-none"
      onPointerMove={handleMove}
      onPointerUp={endDrag}
    >
      <div
        className="absolute h-full bg-orange-500 rounded-full"
        style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
      />
      <button
        type="button"
        aria-label="Trim start"
        onPointerDown={beginDrag("start")}
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-white border-2 border-orange-500 rounded-full shadow cursor-grab active:cursor-grabbing"
        style={{ left: `${startPct}%` }}
      />
      <button
        type="button"
        aria-label="Trim end"
        onPointerDown={beginDrag("end")}
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-white border-2 border-orange-500 rounded-full shadow cursor-grab active:cursor-grabbing"
        style={{ left: `${endPct}%` }}
      />
    </div>
  );
}

export default function VideoTrimModal({
  open,
  file,
  maxDurationS,
  onCancel,
  onConfirm,
}: VideoTrimModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [metadataError, setMetadataError] = useState(false);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Fresh file → fresh preview + reset the picked window.
  useEffect(() => {
    if (!open || !file) return;
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setObjectUrl(url);
    setDuration(null);
    setMetadataError(false);
    setStart(0);
    setEnd(0);
    setIsPlaying(false);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [open, file]);

  // See METADATA_TIMEOUT_MS above — bails out of waiting on the browser to
  // ever fire onLoadedMetadata. Re-runs (and its cleanup clears the pending
  // timer) whenever duration actually resolves, so this is a no-op once
  // reading succeeds.
  useEffect(() => {
    if (!open || !file || duration !== null || metadataError) return;
    const timeoutId = setTimeout(
      () => setMetadataError(true),
      METADATA_TIMEOUT_MS,
    );
    return () => clearTimeout(timeoutId);
  }, [open, file, duration, metadataError]);

  if (!open || !file) return null;

  const handleLoadedMetadata = () => {
    const d = videoRef.current?.duration ?? 0;
    setDuration(d);
    setStart(0);
    setEnd(Math.min(d, maxDurationS));
  };

  const handleTogglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      // Restart from the picked window if playback isn't already inside
      // it (a fresh preview, or one that ran past `end` and stopped) —
      // but resume in place if they paused mid-preview and hit play again.
      if (v.currentTime < start || v.currentTime >= end) v.currentTime = start;
      v.play();
    } else {
      v.pause();
    }
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (v && v.currentTime >= end) v.pause();
  };

  const selectedSeconds = Math.max(0, end - start);
  const canTrim = metadataError
    ? end > start && selectedSeconds <= maxDurationS
    : duration !== null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start h-full justify-center bg-black/50 backdrop-blur-sm px-4 pt-12 pb-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-orange-500 flex items-center justify-center flex-shrink-0">
              <Scissors size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-dash-heading font-bold text-[#023337]">
                Trim your video
              </h3>
              <p className="text-dash-caption text-gray-400">
                Pick up to {maxDurationS} seconds to upload
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {!metadataError && (
            <div className="relative border border-gray-200 rounded-md overflow-hidden bg-black">
              {objectUrl && (
                <video
                  ref={videoRef}
                  src={objectUrl}
                  className="w-full max-h-64 object-contain mx-auto"
                  onLoadedMetadata={handleLoadedMetadata}
                  onError={() => setMetadataError(true)}
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  playsInline
                />
              )}
            </div>
          )}

          {metadataError ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-md">
                <AlertCircle
                  size={15}
                  className="text-amber-500 mt-0.5 flex-shrink-0"
                />
                <p className="text-dash-caption text-amber-700">
                  Couldn&apos;t preview this video on your device. Check your
                  phone&apos;s gallery app for the times you want, then enter
                  them below — trimming still works.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-dash-caption text-gray-500">
                  Start (seconds)
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={start}
                    onChange={(e) =>
                      setStart(Math.max(0, Number(e.target.value) || 0))
                    }
                    className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-dash-body"
                  />
                </label>
                <label className="text-dash-caption text-gray-500">
                  End (seconds)
                  <input
                    type="number"
                    min={start + 1}
                    step={1}
                    value={end}
                    onChange={(e) =>
                      setEnd(
                        Math.max(
                          start + 1,
                          Number(e.target.value) || start + 1,
                        ),
                      )
                    }
                    className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-dash-body"
                  />
                </label>
              </div>
              {selectedSeconds > maxDurationS && (
                <p className="text-dash-caption text-red-600">
                  Keep the window to {maxDurationS} seconds or less (currently{" "}
                  {selectedSeconds.toFixed(0)}s).
                </p>
              )}
            </div>
          ) : duration === null ? (
            <div className="flex items-center justify-center gap-2 py-3 text-dash-body text-gray-400">
              <Loader2 size={15} className="animate-spin" />
              Reading video…
            </div>
          ) : (
            <div className="space-y-2">
              <TrimScrubber
                duration={duration}
                start={start}
                end={end}
                maxWindow={maxDurationS}
                onChange={(s, e) => {
                  setStart(s);
                  setEnd(e);
                  // Scrubbing should show where the cut will actually
                  // start — pausing first avoids the preview racing
                  // ahead of a drag that's still in progress.
                  const v = videoRef.current;
                  if (v) {
                    v.pause();
                    v.currentTime = s;
                  }
                }}
              />
              <div className="flex items-center justify-between text-dash-caption text-gray-500">
                <span>
                  Selected: {formatTime(start)} – {formatTime(end)} (
                  {selectedSeconds.toFixed(1)}s)
                </span>
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className="flex items-center gap-1 font-semibold text-orange-500 hover:text-orange-600 cursor-pointer"
                >
                  {isPlaying ? (
                    <Pause size={12} fill="currentColor" />
                  ) : (
                    <Play size={12} fill="currentColor" />
                  )}
                  {isPlaying ? "Pause" : "Preview"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-dash-body font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(start, end)}
            disabled={!canTrim}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-dash-body font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Trim & Continue
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
