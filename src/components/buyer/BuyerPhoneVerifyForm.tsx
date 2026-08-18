"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buyerApi } from "@/lib/buyer-api-client";
import { useBuyerStore } from "@/store/buyerStore";
import type { Buyer } from "@/types/buyer";
import {
  LoaderIcon,
  PhoneIcon,
  RefreshIcon,
  ShieldCheckIcon,
} from "@/components/icons";

/* The ONE buyer identity form in the app — phone + OTP, nothing else, ever
   (2026-08-18: "just phone and OTP verification, nothing buyers again on
   the system"). Currently only rendered by BuyerRequestOfferWidget (the
   chat's createBuyerRequest handoff), "compact" variant.

   Two visual variants, same logic underneath — "card" (full-size Input/
   Label, matching the login/signup pages' own form styling) is kept for
   any future full-page use, but has no live caller today. "compact" is
   smaller raw inputs sized to sit inside a chat bubble, so the phone ask
   still reads as part of the conversation, not a form that interrupted it. */
export function BuyerPhoneVerifyForm({
  promptLabel,
  onVerified,
  variant = "card",
}: {
  /** Framed around whatever the buyer is actually about to get, e.g. "What's
   *  your number so I can let you know when someone responds?" — never a
   *  bare "Enter your phone number" with no reason attached. */
  promptLabel: string;
  onVerified: (buyer: Buyer) => void;
  variant?: "card" | "compact";
}) {
  const setBuyer = useBuyerStore((s) => s.setBuyer);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  async function sendCode() {
    const trimmed = phone.trim();
    if (trimmed.length < 10) {
      toast.error("Enter a valid phone number.");
      return;
    }
    setSending(true);
    try {
      await buyerApi.post("/api/buyer-auth/request-otp", { phone: trimmed });
      setStep("otp");
      toast.success("Verification code sent.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't send the code.",
      );
    } finally {
      setSending(false);
    }
  }

  async function verifyCode() {
    const otp = code.trim();
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit code.");
      return;
    }
    setVerifying(true);
    try {
      const { buyer } = await buyerApi.post<{ buyer: Buyer }>(
        "/api/buyer-auth/verify-otp",
        { phone: phone.trim(), otp },
      );
      setBuyer(buyer);
      onVerified(buyer);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setVerifying(false);
    }
  }

  const compact = variant === "compact";

  if (step === "phone") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void sendCode();
        }}
        className={compact ? "space-y-2.5" : "space-y-4"}
      >
        {compact ? (
          <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
            <PhoneIcon size={12} className="text-orange-400 shrink-0" />
            {promptLabel}
          </label>
        ) : (
          <Label className="text-gray-600 text-sm mb-1.5 flex items-center gap-2">
            <PhoneIcon className="w-3.5 h-3.5 text-orange-400" />
            {promptLabel}
          </Label>
        )}

        {compact ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="080X XXX XXXX"
              inputMode="tel"
              className="flex-1 min-w-0 h-10 px-3 rounded-lg border border-gray-200 outline-none text-sm focus:border-orange-400"
            />
            <button
              type="submit"
              disabled={sending}
              className="shrink-0 h-10 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold cursor-pointer"
            >
              {sending ? (
                <LoaderIcon size={14} className="animate-spin" />
              ) : (
                "Continue"
              )}
            </button>
          </div>
        ) : (
          <>
            <Input
              autoFocus
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="080X XXX XXXX"
              inputMode="tel"
              className="h-11"
            />
            <Button
              type="submit"
              disabled={sending}
              size="lg"
              className="w-full bg-orange-500 hover:bg-orange-400 cursor-pointer text-white font-semibold shadow-lg shadow-orange-500/20"
            >
              {sending ? "Sending code..." : "Continue"}
            </Button>
          </>
        )}
      </form>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void verifyCode();
      }}
      className={compact ? "space-y-2.5" : "space-y-4"}
    >
      {compact ? (
        <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
          <ShieldCheckIcon size={12} className="text-orange-400 shrink-0" />
          Code sent to {phone} — enter it below
        </label>
      ) : (
        <Label className="text-gray-600 text-sm mb-1.5 flex items-center gap-2">
          <ShieldCheckIcon className="w-3.5 h-3.5 text-orange-400" />
          Code sent to {phone}
        </Label>
      )}

      {compact ? (
        <div className="flex items-center gap-1.5">
          <input
            autoFocus
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="123456"
            className="flex-1 min-w-0 h-10 px-3 rounded-lg border border-gray-200 outline-none text-sm text-center tracking-widest focus:border-orange-400"
          />
          <button
            type="submit"
            disabled={verifying}
            className="shrink-0 h-10 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold cursor-pointer"
          >
            {verifying ? (
              <LoaderIcon size={14} className="animate-spin" />
            ) : (
              "Verify"
            )}
          </button>
        </div>
      ) : (
        <Input
          autoFocus
          value={code}
          onChange={(e) =>
            setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
          placeholder="123456"
          className="h-11 text-center text-lg tracking-widest"
          maxLength={6}
        />
      )}

      {!compact && (
        <Button
          type="submit"
          disabled={verifying}
          size="lg"
          className="w-full bg-orange-500 hover:bg-orange-400 cursor-pointer text-white font-semibold shadow-lg shadow-orange-500/20"
        >
          {verifying ? "Verifying..." : "Verify"}
        </Button>
      )}

      <div className={compact ? "" : "text-center"}>
        <button
          type="button"
          onClick={() => void sendCode()}
          disabled={sending}
          className="text-orange-600 hover:text-orange-700 cursor-pointer text-sm font-medium inline-flex items-center gap-1 disabled:opacity-50"
        >
          {sending ? (
            "Sending..."
          ) : (
            <>
              Resend code <RefreshIcon className="w-3 h-3" />
            </>
          )}
        </button>
      </div>
      <div className="text-center">
        <button
          type="button"
          onClick={() => setStep("phone")}
          className={
            compact
              ? "text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
              : "text-gray-400 hover:text-gray-600 cursor-pointer text-xs"
          }
        >
          Use a different number
        </button>
      </div>
    </form>
  );
}
