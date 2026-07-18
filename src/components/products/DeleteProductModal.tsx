import { createPortal } from "react-dom";
import type { DeleteProductModalProps } from "@/types/product";
import { X } from "lucide-react";

export default function DeleteProductModal({
  open,
  product,
  onClose,
  onConfirm,
}: DeleteProductModalProps) {
  if (!open || !product) return null;
  // Stock no longer gates deletion (removed along with the rest of the
  // stock/quantity concept) — the backend's one remaining gate is a food
  // dish still marked available (`isCurrentlyAvailable` is undefined for
  // retail/service listings, so this only ever blocks a live dish).
  const canDelete = product.isCurrentlyAvailable !== true;

  // Portaled to document.body — rendered inline this backdrop only ever
  // covered its scrollable ancestor's box, not the real viewport (same
  // clipping bug already fixed for dropdowns via AnchoredPopover).
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 z-10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-dash-heading font-semibold text-red-600">
            Delete Listing
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-dash-body text-gray-700">
            Are you sure you want to delete{" "}
            <span className="font-semibold">{product.name}</span>?
          </p>
          {!canDelete && (
            <p className="text-dash-body text-amber-600 bg-amber-50 p-2 rounded">
              ⚠️ This dish is still marked available. Disable availability
              first.
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-dash-body font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => canDelete && onConfirm(product.id)}
              disabled={!canDelete}
              className="flex-1 py-2.5 text-dash-body font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
