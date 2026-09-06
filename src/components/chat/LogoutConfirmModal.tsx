"use client";

import { createPortal } from "react-dom";

import { CloseIcon, LogOutIcon, LoaderIcon } from "@/components/icons";

// "Are you sure?" before a chat-surface sign-out (2026-09-05).
//
// Centered, rounded-2xl, a close button top-right, portaled to
// document.body so it isn't clipped by the chat shell's own
// overflow-hidden ancestor (the reason every modal on this surface is
// portaled, not just this one).
//
// Deliberately NOT styled like the dashboard's DeleteProductModal (red icon
// chip, red confirm button): that convention is for something genuinely
// destructive and irreversible — deleting a listing. Logging out is neither.
// Signing back in gets everything back, so this stays in the same orange/
// neutral palette every other chat gate uses rather than borrowing a
// "danger" treatment logout doesn't deserve.
export function LogoutConfirmModal({
  onConfirm,
  onClose,
  busy,
}: {
  onConfirm: () => void;
  onClose: () => void;
  /** True while the sign-out itself is in flight — disables both buttons so
   *  a second tap can't fire a second sign-out, and swaps the confirm
   *  button's label so the wait is visible rather than looking stuck. */
  busy: boolean;
}) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={busy ? undefined : onClose}
      />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <button
          onClick={onClose}
          disabled={busy}
          aria-label="Dismiss"
          className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CloseIcon size={16} />
        </button>

        <div className="px-6 pb-6 pt-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50">
            <LogOutIcon size={22} className="text-orange-500" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-[#023337]">
            Log out of Velte?
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
            You&apos;ll need to sign in again to see your conversations.
            Anything you&apos;ve saved will still be here when you come back.
          </p>
          <div className="mt-5 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {busy && <LoaderIcon size={15} className="animate-spin" />}
              {busy ? "Logging out…" : "Log out"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
