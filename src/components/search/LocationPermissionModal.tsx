"use client";

import { createPortal } from "react-dom";
import { MapPin, X } from "lucide-react";

// Shown once per page load whenever the browser's own geolocation
// permission is still undecided ("prompt") — explains what the location is
// actually used for BEFORE the native browser prompt fires, instead of that
// prompt just appearing with zero context the instant the page loads (the
// previous behavior). Never shown again this load once the buyer answers
// either way — clicking "Enable Location" triggers the real
// getCurrentPosition() call (and the browser's own native dialog after
// that); "Not now" just closes this and the search runs nationwide, same
// fallback that already existed for a denied/unavailable location.
export function LocationPermissionModal({
  open,
  onAllow,
  onDismiss,
}: {
  open: boolean;
  onAllow: () => void;
  onDismiss: () => void;
}) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onDismiss} />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <X size={16} />
        </button>

        <div className="px-6 pb-6 pt-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50">
            <MapPin size={22} className="text-orange-500" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-[#023337]">
            Find vendors near you
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
            We use your location only to show you the closest vendors who
            actually have what you&apos;re looking for — it&apos;s never shared
            or stored beyond this search.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={onAllow}
              className="w-full rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
            >
              Enable Location
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="w-full py-1 text-sm font-medium text-gray-400 transition-colors hover:text-gray-600"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
