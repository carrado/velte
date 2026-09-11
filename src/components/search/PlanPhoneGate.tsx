"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { CloseIcon, LoaderIcon, PhoneIcon } from "@/components/icons";
import { buyerApi } from "@/lib/buyer-api-client";
import { useBuyerStore } from "@/store/buyerStore";
import type { Buyer } from "@/types/buyer";

// The phone gate in front of a Shopping Plan's background search
// (2026-09-10).
//
// WHY it exists: the plan's whole point is that the buyer can walk away
// while it runs, which means the completion has to reach them somewhere
// other than the page they just left — an SMS. No number, no way to tell
// them, so the number is collected BEFORE the job starts rather than
// discovered to be missing at the end.
//
// WHY IT VERIFIES rather than just saving what's typed. Velte only ever
// texts an OTP-VERIFIED number, and that rule is not about protecting the
// buyer — it protects the stranger whose number a typo belongs to, who
// would otherwise get a real SMS, on Velte's account, about a shopping plan
// they never made. So this reuses the existing request-otp/verify-otp pair
// exactly as the Buyer Request flow does, rather than introducing a second,
// weaker way to attach a number to an account.
//
// Cancelling starts nothing: the caller only proceeds on `onVerified`.

type Step = "phone" | "otp";

export function PlanPhoneGate({
  onVerified,
  onClose,
}: {
  /** Fired once the number is verified and attached to the account — the
   *  caller starts the background search from here, never before. */
  onVerified: () => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    const trimmed = phone.trim();
    // Deliberately permissive, and only about obvious nonsense: the real
    // check is the OTP itself, which no mistyped number can pass. A strict
    // client-side Nigerian-format regex would mostly succeed at rejecting
    // numbers that would actually have worked (+234 vs 0 prefixes, spaces,
    // a legitimate network range we hadn't listed).
    if (trimmed.replace(/\D/g, "").length < 10) {
      toast.error("Enter a valid phone number.");
      return;
    }
    setBusy(true);
    try {
      await buyerApi.post("/api/buyer-auth/request-otp", { phone: trimmed });
      setStep("otp");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't send the code.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (!/^\d{6}$/.test(code.trim())) {
      toast.error("Enter the 6-digit code.");
      return;
    }
    setBusy(true);
    try {
      const { buyer } = await buyerApi.post<{ buyer: Buyer | null }>(
        "/api/buyer-auth/verify-otp",
        { phone: phone.trim(), otp: code.trim() },
      );
      // Straight into the store so nothing downstream has to re-fetch to
      // learn the number is now on the account.
      if (buyer) useBuyerStore.getState().setBuyer(buyer);
      onVerified();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={busy ? undefined : onClose}
      />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl bg-surface shadow-2xl">
        <button
          onClick={onClose}
          disabled={busy}
          aria-label="Dismiss"
          className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CloseIcon size={16} />
        </button>

        <div className="px-6 pb-6 pt-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50">
            <PhoneIcon size={22} className="text-orange-600" />
          </div>

          {step === "phone" ? (
            <>
              <h3 className="mt-4 text-center text-base font-semibold text-ink">
                Where should we reach you?
              </h3>
              {/* The REASON, not just the ask — this is a number being
                  requested in the middle of something else, and "why" is
                  the only thing that makes that reasonable. */}
              <p className="mt-1.5 text-center text-sm leading-relaxed text-gray-500">
                Searching for everything on your list takes a few minutes, and
                it keeps running after you leave this page. Give us a number and
                we&apos;ll text you the moment your plan is ready.
              </p>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                autoFocus
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !busy) void sendCode();
                }}
                placeholder="0803 123 4567"
                // text-base, not a smaller size: iOS Safari zooms the whole
                // page in on focus for anything under 16px.
                className="mt-5 w-full rounded-xl border border-gray-200 px-4 py-3 text-base text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-orange-400"
              />
              <button
                type="button"
                onClick={() => void sendCode()}
                disabled={busy || !phone.trim()}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
              >
                {busy && <LoaderIcon size={15} className="animate-spin" />}
                {busy ? "Sending code…" : "Continue"}
              </button>
            </>
          ) : (
            <>
              <h3 className="mt-4 text-center text-base font-semibold text-ink">
                Enter the code
              </h3>
              <p className="mt-1.5 text-center text-sm leading-relaxed text-gray-500">
                We sent a 6-digit code to{" "}
                <span className="font-medium text-gray-700">
                  {phone.trim()}
                </span>
                .
              </p>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !busy) void verifyCode();
                }}
                placeholder="123456"
                className="mt-5 w-full rounded-xl border border-gray-200 px-4 py-3 text-center text-base tracking-[0.3em] text-gray-900 outline-none transition-colors placeholder:tracking-normal placeholder:text-gray-400 focus:border-orange-400"
              />
              <button
                type="button"
                onClick={() => void verifyCode()}
                disabled={busy || code.length !== 6}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
              >
                {busy && <LoaderIcon size={15} className="animate-spin" />}
                {busy ? "Verifying…" : "Verify and start searching"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setCode("");
                }}
                disabled={busy}
                className="mt-2 w-full py-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-gray-700 disabled:opacity-50"
              >
                Use a different number
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
