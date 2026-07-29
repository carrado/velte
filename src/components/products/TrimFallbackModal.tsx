"use client";

import { createPortal } from "react-dom";
import { AlertCircle, Scissors, X } from "lucide-react";
import type { TrimFallbackModalProps } from "@/types/product";

// The no-preview counterpart to VideoTrimModal — same portal/shell styling,
// but no scrubber and no manual start/end entry, since there's nothing to
// show a preview of and no reliable duration to validate typed numbers
// against. Just a clear heads-up and one fixed choice: first N seconds, or
// pick a different file. The actual cut still happens server-side via real
// ffmpeg (see startTrimUpload in AddProductPage.tsx), so this not knowing
// the exact source duration is fine — trimming to a window longer than the
// real file just stops at the real end, no error.
export default function TrimFallbackModal({
  open,
  maxDurationS,
  onCancel,
  onConfirm,
}: TrimFallbackModalProps) {
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
              Couldn&apos;t preview this video
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
          <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-md">
            <AlertCircle
              size={15}
              className="text-amber-500 mt-0.5 flex-shrink-0"
            />
            <p className="text-dash-caption text-amber-700">
              Your device can&apos;t preview this video, so there&apos;s no way
              to drag a custom start/end here.
            </p>
          </div>
          <p className="text-dash-body text-gray-600">
            We&apos;ll upload just the{" "}
            <span className="font-semibold text-[#023337]">
              first {maxDurationS} seconds
            </span>{" "}
            — the rest gets cut. If you need a different part of the clip, trim
            it in your phone&apos;s gallery app first and upload the shorter
            file instead.
          </p>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-dash-body font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
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
