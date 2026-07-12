"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { walletApi } from "@/services/wallet";
import { queryKeys } from "@/lib/query-keys";
import type { Wallet } from "@/types/wallet";

// Bank transfer (DVA) funding is part of the plan (spec's card + DVA fallback
// model) but not surfaced right now — Paystack's Dedicated NUBAN requires the
// merchant account to complete business verification first, and until that's
// done every request errors with "Dedicated NUBAN not available for this
// business". The backend endpoint (`requestDva`) is untouched and ready to
// re-enable here once that's sorted — this is a UI-only removal.
const MIN_AMOUNT_NAIRA = 1000;

// Thumb rest positions in px, matching translate-x-0.5 / translate-x-4.5 on a
// w-10 track with a w-5 thumb.
const THUMB_OFF_X = 2;
const THUMB_ON_X = 18;
const THUMB_MID_X = (THUMB_OFF_X + THUMB_ON_X) / 2;

export default function FundingMethodModal({
  open,
  wallet,
  onClose,
}: {
  open: boolean;
  wallet: Wallet | undefined;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState("");
  const [topup, setTopup] = useState("");
  // First-time setup (no card on file): saving redirects to Paystack instead
  // of writing to the DB — this gates the notice explaining that.
  const [redirectOpen, setRedirectOpen] = useState(false);
  // Where the pointer went down on the toggle — lets a horizontal slide on the
  // thumb set the state directionally (right = on, left = off) while a plain
  // tap keeps toggling.
  const dragStartXRef = useRef<number | null>(null);
  // Live thumb offset (px) while the finger is down; null when not dragging.
  const [dragX, setDragX] = useState<number | null>(null);

  // Re-seed the form from `wallet` whenever the modal transitions to open —
  // setState during render (not in an effect) per React's "adjusting state
  // when a prop changes" pattern, so it doesn't cost an extra paint.
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    setRedirectOpen(false);
    if (open && wallet) {
      setEnabled(wallet.autoRecharge.enabled);
      setThreshold(String(wallet.autoRecharge.thresholdKobo / 100 || ""));
      setTopup(String(wallet.autoRecharge.topupKobo / 100 || ""));
    }
  }

  // Card on file: a plain preferences update, written directly.
  const saveMutation = useMutation({
    mutationFn: () =>
      walletApi.setFundingMethod({
        enabled,
        thresholdKobo: Math.round(Number(threshold) * 100),
        topupKobo: Math.round(Number(topup) * 100),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet.detail });
      toast.success("Funding method updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // First-time setup: nothing is written yet — the preferences ride along in
  // the Paystack transaction metadata and the backend persists them (with
  // auto-recharge switched on) only once the card payment succeeds.
  const checkoutMutation = useMutation({
    mutationFn: () =>
      walletApi.initializeTopup(Number(topup), {
        thresholdKobo: Math.round(Number(threshold) * 100),
        topupKobo: Math.round(Number(topup) * 100),
      }),
    onSuccess: ({ authorizationUrl }) => {
      window.location.href = authorizationUrl;
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!open || !wallet) return null;

  const hasCard = wallet.autoRecharge.hasCardOnFile;
  const thresholdNum = Number(threshold);
  const topupNum = Number(topup);
  const thresholdValid =
    threshold.trim() !== "" &&
    Number.isFinite(thresholdNum) &&
    thresholdNum >= MIN_AMOUNT_NAIRA;
  const topupValid =
    topup.trim() !== "" &&
    Number.isFinite(topupNum) &&
    topupNum >= MIN_AMOUNT_NAIRA;
  const isValid = thresholdValid && topupValid;

  // Portaled to document.body — rendered inline this backdrop only ever
  // covered its scrollable ancestor's box, not the real viewport (same
  // clipping bug already fixed for dropdowns via AnchoredPopover).
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-dash-heading font-semibold text-gray-900">
            Funding Method
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-dash-body font-semibold text-gray-900">
              Auto-recharge (card)
            </label>
            <button
              type="button"
              // Pointer events own mouse/touch: slide right = on, left = off,
              // small movement = tap-toggle. onClick stays only for keyboard
              // activation (Enter/Space fires a click with detail === 0 and no
              // preceding pointer events).
              onPointerDown={(e) => {
                if (!hasCard) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                dragStartXRef.current = e.clientX;
              }}
              onPointerMove={(e) => {
                if (!hasCard || dragStartXRef.current === null) return;
                const base = enabled ? THUMB_ON_X : THUMB_OFF_X;
                const x = base + e.clientX - dragStartXRef.current;
                setDragX(Math.min(THUMB_ON_X, Math.max(THUMB_OFF_X, x)));
              }}
              onPointerUp={(e) => {
                if (!hasCard || dragStartXRef.current === null) return;
                const delta = e.clientX - dragStartXRef.current;
                dragStartXRef.current = null;
                setDragX(null);
                if (Math.abs(delta) < 5) setEnabled((v) => !v);
                else
                  setEnabled(
                    (enabled ? THUMB_ON_X : THUMB_OFF_X) + delta > THUMB_MID_X,
                  );
              }}
              onPointerCancel={() => {
                dragStartXRef.current = null;
                setDragX(null);
              }}
              onClick={(e) => {
                if (hasCard && e.detail === 0) setEnabled((v) => !v);
              }}
              disabled={!hasCard}
              className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer touch-none disabled:cursor-not-allowed disabled:opacity-40 ${
                (dragX !== null ? dragX > THUMB_MID_X : enabled)
                  ? "bg-orange-500"
                  : "bg-gray-200"
              }`}
            >
              <span
                style={
                  dragX !== null
                    ? { transform: `translateX(${dragX}px)` }
                    : undefined
                }
                className={`absolute top-0.5 left-0 w-5 h-5 bg-white rounded-full ${
                  dragX !== null
                    ? ""
                    : `transition-transform ${
                        enabled ? "translate-x-4.5" : "translate-x-0.5"
                      }`
                }`}
              />
            </button>
          </div>

          {hasCard ? (
            <p className="text-dash-secondary text-gray-400">
              Card on file
              {wallet.autoRecharge.last4
                ? ` •••• ${wallet.autoRecharge.last4}`
                : ""}
              {wallet.autoRecharge.cardType
                ? ` (${wallet.autoRecharge.cardType})`
                : ""}
            </p>
          ) : (
            <div className="bg-orange-50 rounded-lg px-3.5 py-3">
              <p className="text-dash-secondary text-gray-600">
                No card on file yet — set your amounts below and save.
                You&apos;ll make your first top-up by card, and auto-recharge
                turns on automatically once that payment completes.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-dash-secondary text-gray-500 block mb-1">
                Recharge when below
              </label>
              <input
                type="number"
                min={MIN_AMOUNT_NAIRA}
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder="₦"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-dash-body focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
              {!thresholdValid && threshold.trim() !== "" && (
                <p className="text-dash-caption text-red-500 mt-1">
                  Recharge when below must be at least ₦1,000.
                </p>
              )}
            </div>
            <div>
              <label className="text-dash-secondary text-gray-500 block mb-1">
                Top up by
              </label>
              <input
                type="number"
                min={MIN_AMOUNT_NAIRA}
                value={topup}
                onChange={(e) => setTopup(e.target.value)}
                placeholder="₦"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-dash-body focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
              {!topupValid && topup.trim() !== "" && (
                <p className="text-dash-caption text-red-500 mt-1">
                  Top up by must be at least ₦1,000.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2 text-dash-caption text-gray-400">
            <ShieldCheck size={14} className="text-green-500 mt-0.5 shrink-0" />
            <p>
              Your card details are handled securely by Paystack — they never
              touch or get stored on our servers. See our{" "}
              <Link
                href="/privacy"
                target="_blank"
                className="text-orange-600 hover:text-orange-700 underline underline-offset-2"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>

          <button
            onClick={() =>
              hasCard ? saveMutation.mutate() : setRedirectOpen(true)
            }
            disabled={!isValid || saveMutation.isPending}
            className="w-full flex items-center justify-center gap-2 py-2 text-dash-body font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saveMutation.isPending && (
              <Loader2 size={14} className="animate-spin" />
            )}
            Save
          </button>
        </div>
      </div>

      {redirectOpen && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() =>
              !checkoutMutation.isPending && setRedirectOpen(false)
            }
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 z-10 px-6 py-5">
            <h3 className="text-dash-body font-semibold text-gray-900 mb-1.5">
              One more step
            </h3>
            <p className="text-dash-secondary text-gray-500 mb-4">
              You&apos;ll be redirected to Paystack to pay{" "}
              <span className="font-semibold text-gray-700">
                ₦{Number(topup).toLocaleString("en-NG")}
              </span>{" "}
              (your &quot;Top up by&quot; amount) by card. Once the payment
              completes, your preferences are saved and auto-recharge turns on.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRedirectOpen(false)}
                disabled={checkoutMutation.isPending}
                className="flex-1 py-2 text-dash-body font-medium border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => checkoutMutation.mutate()}
                disabled={checkoutMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-dash-body font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 cursor-pointer"
              >
                {checkoutMutation.isPending && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                Continue to Paystack
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
