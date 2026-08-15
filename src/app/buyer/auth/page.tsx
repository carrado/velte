"use client";

import { Suspense, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  Phone,
  ArrowRight,
  RefreshCw,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buyerApi } from "@/lib/buyer-api-client";
import { useBuyerStore } from "@/store/buyerStore";
import type { Buyer } from "@/types/buyer";

/* Spec §3/§43: browsing/search stays fully anonymous — this page is only
   ever reached when a buyer taps an action that genuinely needs an account
   (posting a request, saving an item). Rebuilt 2026-08-14 around a single
   idea: phone + OTP is the WHOLE registration. Two buyers can't share a
   phone number, so that alone is enough to create a real, unique account —
   username is auto-generated server-side (verifyOtp), and name is asked as
   a single skippable follow-up AFTER the buyer is already verified and
   through the door, never as a blocking field on the OTP form itself. No
   password, ever. */

const phoneSchema = z
  .string()
  .trim()
  .min(10, "Enter a valid phone number")
  .regex(/^[\d+][\d\s-]*$/, "Digits only");

const otpSchema = z
  .string()
  .length(6, "Must be 6 digits")
  .regex(/^\d+$/, "Only digits");

const nameSchema = z.string().trim().min(2, "Enter your name");

// Copy varies by WHY the buyer landed here — an unexplained phone-number
// ask reads as arbitrary; naming the actual payoff ("we'll text you when a
// vendor responds") makes it feel like part of the thing they were already
// doing, not a gate in front of it. `redirect` alone can't carry this (it's
// a path, not an intent), so callers pass `reason` alongside it — see
// requests/new/page.tsx and useSavedItems.ts.
// "text you" is accurate specifically for the request flow — a response
// really does fire a real SMS (see buyerNotification.service.js's
// SMS_TYPES, re-added 2026-08-14), not just in-app/push. `save` stays on
// "let you know" — saved-item/follow triggers are in-app + push only, so
// promising a text there would be a claim the product doesn't back up.
const REASON_COPY: Record<
  string,
  { eyebrow: string; title: string; body: string }
> = {
  request: {
    eyebrow: "One quick step",
    title: "Get vendor responses",
    body: "We'll text you the moment a vendor responds to your request — verify your number so we know where to send it.",
  },
  save: {
    eyebrow: "One quick step",
    title: "Save this to your account",
    body: "Verify your number so we can save this for you and let you know if anything changes.",
  },
  default: {
    eyebrow: "Quick verification",
    title: "What's your number?",
    body: "We'll text you a 6-digit code to confirm it's you.",
  },
};

function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return <p className="text-red-500 text-xs mt-1">{message}</p>;
}

function BuyerAuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Where to send the buyer once verified — the caller (e.g. the
  // Post-a-Request page) sets this before redirecting here. Falls back to
  // the Requests tab, a sensible default landing spot post-verification.
  const redirectTo = searchParams.get("redirect") || "/buyer/requests";
  const reason =
    REASON_COPY[searchParams.get("reason") ?? ""] ?? REASON_COPY.default;

  const setBuyer = useBuyerStore((s) => s.setBuyer);
  const [step, setStep] = useState<"phone" | "otp" | "name">("phone");
  const [phone, setPhone] = useState("");
  const [verifiedBuyer, setVerifiedBuyer] = useState<Buyer | null>(null);

  function finish(buyer: Buyer) {
    setBuyer(buyer);
    router.push(redirectTo);
  }

  const requestOtpMutation = useMutation({
    mutationFn: (p: string) =>
      buyerApi.post("/api/buyer-auth/request-otp", { phone: p }),
    onSuccess: (_data, p) => {
      setPhone(p);
      setStep("otp");
      toast.success("Verification code sent.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Couldn't send the code. Try again.");
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: (data: { phone: string; otp: string }) =>
      buyerApi.post<{ buyer: Buyer }>("/api/buyer-auth/verify-otp", data),
    onSuccess: ({ buyer }) => {
      // A returning buyer already has a name — nothing left to ask, drop
      // them straight into whatever they came here to do. Only a
      // brand-new buyer sees the name step, and even that's skippable.
      if (buyer.name) {
        finish(buyer);
      } else {
        setVerifiedBuyer(buyer);
        setBuyer(buyer);
        setStep("name");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Invalid or expired code.");
    },
  });

  const nameMutation = useMutation({
    mutationFn: (name: string) =>
      buyerApi.patch<{ buyer: Buyer }>("/api/buyer-auth/me", { name }),
    onSuccess: ({ buyer }) => finish(buyer),
    onError: () => {
      // Never block on this — the buyer is already verified and their
      // original action already went through (or is about to). Worst case
      // they stay "Hi there" on Profile until they set it later.
      if (verifiedBuyer) finish(verifiedBuyer);
    },
  });

  const phoneForm = useForm({
    defaultValues: { phone: "" },
    onSubmit: ({ value }) => {
      const parsed = phoneSchema.safeParse(value.phone);
      if (!parsed.success) return;
      requestOtpMutation.mutate(parsed.data);
    },
  });

  const otpForm = useForm({
    defaultValues: { code: "" },
    onSubmit: ({ value }) => {
      const otpParsed = otpSchema.safeParse(value.code);
      if (!otpParsed.success) return;
      verifyOtpMutation.mutate({ phone, otp: otpParsed.data });
    },
  });

  const nameForm = useForm({
    defaultValues: { name: "" },
    onSubmit: ({ value }) => {
      const parsed = nameSchema.safeParse(value.name);
      if (!parsed.success) return;
      nameMutation.mutate(parsed.data);
    },
  });

  const stepMeta =
    step === "phone"
      ? { eyebrow: reason.eyebrow, title: reason.title, body: reason.body }
      : step === "otp"
        ? {
            eyebrow: "Enter your code",
            title: "Check your phone",
            body: (
              <>
                We sent a code to{" "}
                <span className="text-orange-500 font-medium">{phone}</span>
              </>
            ),
          }
        : {
            eyebrow: "Last thing",
            title: "You're verified 🎉",
            body: "What should we call you?",
          };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative w-full max-w-[440px]"
    >
      <Link href="/" className="flex items-center gap-2.5 justify-center mb-3">
        <Image
          src="/velte_logo_esn5dj.png"
          alt="Velte logo"
          width={100}
          height={49}
          priority
        />
      </Link>

      <div className="bg-white border border-white/[0.08] sm:rounded-2xl p-8 shadow-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-8 text-center">
              <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-500 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
                {stepMeta.eyebrow}
              </div>
              <h1 className="text-2xl font-bold text-black mb-2 tracking-tight">
                {stepMeta.title}
              </h1>
              <p className="text-black/45 text-sm">{stepMeta.body}</p>
            </div>

            {step === "phone" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void phoneForm.handleSubmit();
                }}
                className="space-y-5"
              >
                <phoneForm.Field
                  name="phone"
                  validators={{
                    onChange: ({ value }) => {
                      const r = phoneSchema.safeParse(value);
                      return r.success ? undefined : r.error.issues[0]?.message;
                    },
                  }}
                >
                  {(field) => (
                    <div>
                      <Label className="text-black/70 text-sm mb-1.5 flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-orange-400" />
                        Phone number
                      </Label>
                      <Input
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        placeholder="080X XXX XXXX"
                        className="h-11"
                        inputMode="tel"
                        autoFocus
                      />
                      <FieldError message={field.state.meta.errors[0]} />
                    </div>
                  )}
                </phoneForm.Field>

                <phoneForm.Subscribe
                  selector={(s) => [s.canSubmit, s.isSubmitting]}
                >
                  {([canSubmit, isSubmitting]) => (
                    <Button
                      type="submit"
                      disabled={
                        !canSubmit ||
                        isSubmitting ||
                        requestOtpMutation.isPending
                      }
                      size="lg"
                      className="w-full bg-orange-500 hover:bg-orange-400 cursor-pointer text-white font-semibold shadow-lg shadow-orange-500/20 gap-2"
                    >
                      {requestOtpMutation.isPending
                        ? "Sending..."
                        : "Send code"}
                      {!requestOtpMutation.isPending && (
                        <ArrowRight className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </phoneForm.Subscribe>

                <p className="text-black/35 text-[11px] text-center leading-relaxed">
                  Your number is only used for verification and notifications
                  about your own activity on Velte — never shared, never sold.
                </p>
              </form>
            )}

            {step === "otp" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void otpForm.handleSubmit();
                }}
                className="space-y-5"
              >
                <otpForm.Field
                  name="code"
                  validators={{
                    onChange: ({ value }) => {
                      const r = otpSchema.safeParse(value);
                      return r.success ? undefined : r.error.issues[0]?.message;
                    },
                  }}
                >
                  {(field) => (
                    <div>
                      <Label className="text-black/70 text-sm mb-1.5 flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
                        Verification code
                      </Label>
                      <Input
                        value={field.state.value}
                        onChange={(e) =>
                          field.handleChange(
                            e.target.value.replace(/\D/g, "").slice(0, 6),
                          )
                        }
                        onBlur={field.handleBlur}
                        placeholder="123456"
                        className="h-11 text-center text-lg tracking-widest"
                        maxLength={6}
                        autoFocus
                      />
                      <FieldError message={field.state.meta.errors[0]} />
                    </div>
                  )}
                </otpForm.Field>

                <otpForm.Subscribe
                  selector={(s) => [s.canSubmit, s.isSubmitting]}
                >
                  {([canSubmit, isSubmitting]) => (
                    <Button
                      type="submit"
                      disabled={
                        !canSubmit ||
                        isSubmitting ||
                        verifyOtpMutation.isPending
                      }
                      size="lg"
                      className="w-full bg-orange-500 hover:bg-orange-400 cursor-pointer text-white font-semibold shadow-lg shadow-orange-500/20 gap-2"
                    >
                      {verifyOtpMutation.isPending ? "Verifying..." : "Verify"}
                      {!verifyOtpMutation.isPending && (
                        <ArrowRight className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </otpForm.Subscribe>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => requestOtpMutation.mutate(phone)}
                    disabled={requestOtpMutation.isPending}
                    className="text-orange-500 hover:text-orange-400 cursor-pointer text-sm font-medium inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    {requestOtpMutation.isPending ? (
                      "Sending..."
                    ) : (
                      <>
                        Resend code <RefreshCw className="w-3 h-3" />
                      </>
                    )}
                  </button>
                </div>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setStep("phone")}
                    className="text-black/40 hover:text-black/60 cursor-pointer text-xs"
                  >
                    Use a different number
                  </button>
                </div>
              </form>
            )}

            {step === "name" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void nameForm.handleSubmit();
                }}
                className="space-y-5"
              >
                <nameForm.Field
                  name="name"
                  validators={{
                    onChange: ({ value }) => {
                      const r = nameSchema.safeParse(value);
                      return r.success ? undefined : r.error.issues[0]?.message;
                    },
                  }}
                >
                  {(field) => (
                    <div>
                      <Label className="text-black/70 text-sm mb-1.5 flex items-center gap-2">
                        <UserRound className="w-3.5 h-3.5 text-orange-400" />
                        Your name
                      </Label>
                      <Input
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        placeholder="e.g. Tolu Adebayo"
                        className="h-11"
                        autoFocus
                      />
                      <FieldError message={field.state.meta.errors[0]} />
                    </div>
                  )}
                </nameForm.Field>

                <nameForm.Subscribe
                  selector={(s) => [s.canSubmit, s.isSubmitting]}
                >
                  {([canSubmit, isSubmitting]) => (
                    <Button
                      type="submit"
                      disabled={
                        !canSubmit || isSubmitting || nameMutation.isPending
                      }
                      size="lg"
                      className="w-full bg-orange-500 hover:bg-orange-400 cursor-pointer text-white font-semibold shadow-lg shadow-orange-500/20 gap-2"
                    >
                      {nameMutation.isPending ? "Saving..." : "Continue"}
                      {!nameMutation.isPending && (
                        <ArrowRight className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </nameForm.Subscribe>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => verifiedBuyer && finish(verifiedBuyer)}
                    className="text-black/40 hover:text-black/60 cursor-pointer text-xs"
                  >
                    Skip for now
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function BuyerAuthPage() {
  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <div
        className="fixed inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(249,115,22,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.6) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <Suspense fallback={<div>Loading...</div>}>
          <BuyerAuthForm />
        </Suspense>
      </div>
    </div>
  );
}
