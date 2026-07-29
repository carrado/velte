"use client";

import { createPortal } from "react-dom";
import { Scissors, Upload } from "lucide-react";
import type { VideoUploadProgressBarProps } from "@/types/product";

// Floating banner, not a blocking modal — video upload/trim now runs in the
// background from the moment a file's picked (or a trim window's confirmed),
// so the vendor keeps filling out the rest of the form while this just
// reports progress. Portaled to document.body and pinned to the very top of
// the viewport, same slot convention as the page-navigation bar in
// NavigationProgressContext.tsx (fixed + high z-index so no dashboard
// scroll container can clip it), just a richer banner instead of a 3px
// sliver since this needs text + a Cancel button too.
export default function VideoUploadProgressBar({
  phase,
  progress,
  onCancel,
}: VideoUploadProgressBarProps) {
  const label = phase === "trimming" ? "Trimming video…" : "Uploading video…";

  return createPortal(
    <div className="fixed top-0 inset-x-0 z-[200] bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
          {phase === "trimming" ? (
            <Scissors size={14} className="text-orange-500" />
          ) : (
            <Upload size={14} className="text-orange-500 animate-bounce" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-dash-caption font-semibold text-[#023337] truncate">
              {label}
            </p>
            <p className="text-dash-caption font-bold text-[#023337] shrink-0">
              {progress}%
            </p>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden mt-1">
            <div
              className="h-full bg-orange-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <button
          onClick={onCancel}
          className="px-3.5 h-8 rounded-lg border border-gray-200 text-dash-caption font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer flex-shrink-0"
        >
          Cancel
        </button>
      </div>
    </div>,
    document.body,
  );
}
