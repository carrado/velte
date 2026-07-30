"use client";

import { createPortal } from "react-dom";
import { AlertCircle, Scissors, X } from "lucide-react";
import type { TrimConfirmModalProps } from "@/types/product";

function formatTime(s: number): string {
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Replaces the old interactive scrubber/manual-entry trim modals — trimming
// is no longer a vendor choice, just a heads-up before it happens. The
// actual cut always keeps a fixed first `maxDurationS` seconds and runs
// server-side via real ffmpeg (see startTrimUpload in AddProductPage.tsx),
// so not knowing the exact source duration (durationS null) is fine —
// trimming to a window longer than the real file just stops at the real
// end, no error.
export default function TrimConfirmModal({
  open,
  durationS,
  maxDurationS,
  onCancel,
  onConfirm,
}: TrimConfirmModalProps) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-orange-500 flex items-center justify-center flex-shrink-0">
              <Scissors size={18} className="text-white" />
            </div>
            <h3 className="text-dash-heading font-bold text-[#023337]">
              This video will be trimmed
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-3.5">
          {durationS != null ? (
            <p className="text-dash-body text-gray-600">
              Your video is{" "}
              <span className="font-semibold text-[#023337]">
                {formatTime(durationS)}
              </span>{" "}
              long — longer than the {maxDurationS}-second limit. We&apos;ll
              upload just the{" "}
              <span className="font-semibold text-[#023337]">
                first {maxDurationS} seconds
              </span>
              ; the rest gets cut.
            </p>
          ) : (
            <>
              <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-md">
                <AlertCircle
                  size={15}
                  className="text-amber-500 mt-0.5 flex-shrink-0"
                />
                <p className="text-dash-caption text-amber-700">
                  We couldn&apos;t read this video&apos;s exact length on your
                  device.
                </p>
              </div>
              <p className="text-dash-body text-gray-600">
                If it&apos;s longer than {maxDurationS} seconds, we&apos;ll
                upload just the{" "}
                <span className="font-semibold text-[#023337]">
                  first {maxDurationS} seconds
                </span>
                ; the rest gets cut.
              </p>
            </>
          )}
          <p className="text-dash-caption text-gray-400">
            Need a different part of the clip? Trim it in your phone&apos;s
            gallery app first and upload the shorter file instead.
          </p>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-dash-body font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 cursor-pointer"
          >
            Choose a different video
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 text-dash-body font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 cursor-pointer"
          >
            Trim &amp; Upload
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
