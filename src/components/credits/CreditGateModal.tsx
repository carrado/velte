"use client";

import { createPortal } from "react-dom";

import { CloseIcon, LockIcon } from "@/components/icons";
import { GoogleSignInButton } from "@/components/chat/GoogleSignInButton";
import { useCreditsModal } from "@/components/credits/CreditsModal";

// "You can't afford this yet" — shown the moment a buyer picks a composer
// tool (Compare, Shopping Plan) their CURRENT balance can't cover (2026-09-06).
//
// Checked at SELECTION time, not at send time, deliberately: the old
// behaviour let a buyer pick a tool, type a whole message, and only find out
// it was refused after tapping send — the worst place to learn a tool is out
// of reach. Catching it the moment the tool is picked means the composer
// never even shows the tool's badge for something that was going to be
// refused anyway.
//
// Same overlay/card shape every chat-surface modal here uses (see
// LogoutConfirmModal.tsx) — centered, rounded-2xl, portaled to document.body
// so it isn't clipped by the chat shell's own overflow-hidden ancestor.
//
// Two reasons, never both at once — a guest has no wallet to top up, and a
// signed-in account has no sign-in step left to take:
//  - GUEST: the fix is signing in. Not because signing in grants anything any
//    more (it doesn't — see credits.ts's own note on dropping SIGNUP_CREDITS)
//    but because a guest cannot buy credits at all; the pack grid is
//    signed-in only.
//  - SIGNED IN: the fix is a top-up, opened straight from here rather than a
//    second tap — closing this modal only to make them find the credits
//    button themselves would be the same "one more step to a refusal" this
//    modal exists to remove.
export function CreditGateModal({
  toolLabel,
  balance,
  isGuest,
  onClose,
}: {
  /** "Compare", "Shopping Plan" — the tool label the composer already shows. */
  toolLabel: string;
  /** What they currently have. Shown for context; the tool's own price is
   *  deliberately NOT — per-action pricing isn't shown to buyers anywhere
   *  else in the product (see CreditsPanel's own note on the price list it
   *  replaced), and this modal doesn't get to be the exception. */
  balance: number;
  isGuest: boolean;
  onClose: () => void;
}) {
  const { open: openCreditsModal } = useCreditsModal();

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <button
          onClick={onClose}
          aria-label="Dismiss"
          className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <CloseIcon size={16} />
        </button>

        <div className="px-6 pb-6 pt-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50">
            <LockIcon size={22} className="text-orange-500" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-[#023337]">
            Not enough credits for {toolLabel}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
            You have {balance} credit{balance === 1 ? "" : "s"} left — not quite
            enough for {toolLabel} right now.
          </p>

          <div className="mt-5">
            {isGuest ? (
              <>
                <div className="flex justify-center">
                  <GoogleSignInButton onSignedIn={onClose} />
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  Signing in lets you top up — the pack grid isn&apos;t
                  available to a guest.
                </p>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  openCreditsModal();
                }}
                className="w-full rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
              >
                Top up
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
