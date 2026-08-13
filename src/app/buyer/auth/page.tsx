"use client";

import { Suspense, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { motion } from "motion/react";
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
  AtSign,
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
   (posting a request, saving an item). Kept to phone + a 6-digit code, no
   password — matches §3's "keep buyer registration extremely lightweight."
   Deliberately combines phone entry + OTP verify in one page/two steps
   rather than two routes, so the redirect target (see below) only has to
   be threaded through once. */

const phoneSchema = z
  .string()
  .trim()
  .min(10, "Enter a valid phone number")
  .regex(/^[\d+][\d\s-]*$/, "Digits only");

const otpSchema = z
  .string()
  .length(6, "Must be 6 digits")
  .regex(/^\d+$/, "Only digits");

// Mirrors buyerAuth.controller.js's USERNAME_RE exactly — client-side check
// is just so the error shows before the round trip, the backend is the
// real, uniqueness-enforcing gate.
const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9_]{3,20}$/,
    "3-20 characters — letters, numbers and underscores only",
  );

const nameSchema = z.string().trim().min(2, "Enter your name");

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

  const setBuyer = useBuyerStore((s) => s.setBuyer);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");

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
    mutationFn: (data: {
      phone: string;
      otp: string;
      username: string;
      name: string;
    }) => buyerApi.post<{ buyer: Buyer }>("/api/buyer-auth/verify-otp", data),
    onSuccess: ({ buyer }) => {
      setBuyer(buyer);
      router.push(redirectTo);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Invalid or expired code.");
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
    defaultValues: { code: "", username: "", name: "" },
    onSubmit: ({ value }) => {
      const otpParsed = otpSchema.safeParse(value.code);
      const usernameParsed = usernameSchema.safeParse(value.username);
      const nameParsed = nameSchema.safeParse(value.name);
      if (!otpParsed.success || !usernameParsed.success || !nameParsed.success)
        return;
      verifyOtpMutation.mutate({
        phone,
        otp: otpParsed.data,
        username: usernameParsed.data,
        name: nameParsed.data,
      });
    },
  });

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
          height={20}
          priority
        />
      </Link>

      <div className="bg-white border border-white/[0.08] sm:rounded-2xl p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-500 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
            {step === "phone" ? "Quick verification" : "Enter your code"}
          </div>
          <h1 className="text-2xl font-bold text-black mb-2 tracking-tight">
            {step === "phone" ? "What's your number?" : "Check your phone"}
          </h1>
          <p className="text-black/45 text-sm">
            {step === "phone" ? (
              "We'll text you a 6-digit code to confirm it's you."
            ) : (
              <>
                We sent a code to{" "}
                <span className="text-orange-500 font-medium">{phone}</span>
              </>
            )}
          </p>
        </div>

        {step === "phone" ? (
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
                    !canSubmit || isSubmitting || requestOtpMutation.isPending
                  }
                  size="lg"
                  className="w-full bg-orange-500 hover:bg-orange-400 cursor-pointer text-white font-semibold shadow-lg shadow-orange-500/20 gap-2"
                >
                  {requestOtpMutation.isPending ? "Sending..." : "Send code"}
                  {!requestOtpMutation.isPending && (
                    <ArrowRight className="w-4 h-4" />
                  )}
                </Button>
              )}
            </phoneForm.Subscribe>
          </form>
        ) : (
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

            <otpForm.Field
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
                  />
                  <FieldError message={field.state.meta.errors[0]} />
                </div>
              )}
            </otpForm.Field>

            <otpForm.Field
              name="username"
              validators={{
                onChange: ({ value }) => {
                  const r = usernameSchema.safeParse(value);
                  return r.success ? undefined : r.error.issues[0]?.message;
                },
              }}
            >
              {(field) => (
                <div>
                  <Label className="text-black/70 text-sm mb-1.5 flex items-center gap-2">
                    <AtSign className="w-3.5 h-3.5 text-orange-400" />
                    Choose a username
                  </Label>
                  <Input
                    value={field.state.value}
                    onChange={(e) =>
                      field.handleChange(e.target.value.toLowerCase())
                    }
                    onBlur={field.handleBlur}
                    placeholder="e.g. tolu_a"
                    className="h-11"
                    autoCapitalize="none"
                    maxLength={20}
                  />
                  <p className="text-black/40 text-xs mt-1">
                    Two buyers can&apos;t share a username.
                  </p>
                  <FieldError message={field.state.meta.errors[0]} />
                </div>
              )}
            </otpForm.Field>

            <otpForm.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  disabled={
                    !canSubmit || isSubmitting || verifyOtpMutation.isPending
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
