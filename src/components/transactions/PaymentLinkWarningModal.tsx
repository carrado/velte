"use client";

import { AlertTriangle, Loader2, X } from "lucide-react";
import type { PaymentLinkWarningModalProps } from "@/types/transaction";

const COPY = {
  deactivate: {
    title: "Deactivate payment link?",
    confirmLabel: "Deactivate",
    points: [
      "Customers will no longer be able to pay through this link.",
      "If there are pending transactions on this link, they will not be processed.",
      "You can reactivate the link later from this page.",
    ],
  },
  delete: {
    title: "Delete payment link?",
    confirmLabel: "Delete link",
    points: [
      "This link will be removed from your account and deactivated.",
      "If there are pending transactions on this link, they will not be processed.",
      "You will need to generate a new payment link to accept payments again.",
    ],
  },
} as const;

export default function PaymentLinkWarningModal({
  open,
  variant,
  loading = false,
  onClose,
  onConfirm,
}: PaymentLinkWarningModalProps) {
  if (!open) return null;

  const { title, confirmLabel, points } = COPY[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={loading ? undefined : onClose}
        aria-hidden
      />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md z-10 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-dash-heading font-semibold text-red-600">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={18} className="text-amber-600" />
            </div>
            <ul className="space-y-2 text-dash-body text-gray-600 list-disc pl-4">
              {points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 text-dash-body font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-2.5 text-dash-body font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Please wait…
                </>
              ) : (
                confirmLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
