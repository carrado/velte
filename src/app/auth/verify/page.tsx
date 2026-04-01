"use client";

import { Suspense } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, ArrowRight, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import Image from "next/image";
import { usersApi } from "@/services/users";

const verifySchema = z.object({
  code: z
    .string()
    .length(6, "Verification code must be 6 digits")
    .regex(/^\d+$/, "Only digits allowed"),
});

type VerifyForm = z.infer<typeof verifySchema>;

function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return <p className="text-red-400 text-xs mt-1">{message}</p>;
}

// Inner component that uses useSearchParams
function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email"); // email passed from signup

  const verifyMutation = useMutation({
    mutationFn: (data: { email: string; otp: string }) => usersApi.verify(data),
    onSuccess: () => {
      toast.success("Email verified successfully!");
      router.push("/auth/login");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Invalid or expired code");
    },
  });

  const resendMutation = useMutation({
    mutationFn: () =>
      apiClient("/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    onSuccess: () => {
      toast.success("New verification code sent!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to resend code");
    },
  });

  const form = useForm({
    defaultValues: {
      code: "",
    } satisfies VerifyForm,
    onSubmit: ({ value }) => {
      const parsed = verifySchema.safeParse(value);
      if (!parsed.success || !email) return;
      verifyMutation.mutate({ email, otp: value.code });
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative w-full max-w-[440px]"
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 justify-center mb-3">
        <Image
          src="/velte_ijulb7ijulb7ijul_h3d6xw.png"
          alt="Velte logo"
          width={100}
          height={20}
          priority
        />
      </Link>

      {/* Card */}
      <div className="bg-white border border-white/[0.08] rounded-2xl p-8 shadow-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
            Verify your email
          </div>
          <h1 className="text-2xl font-bold text-black mb-2 tracking-tight">
            Check your inbox
          </h1>
          <p className="text-black/45 text-sm">
            We sent a 6-digit code to{" "}
            <span className="text-orange-500 font-medium">
              {email || "your email"}
            </span>
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className="space-y-5"
        >
          {/* Code input */}
          <form.Field
            name="code"
            validators={{
              onChange: ({ value }) => {
                const r = z
                  .string()
                  .length(6, "Must be 6 digits")
                  .regex(/^\d+$/, "Only digits")
                  .safeParse(value);
                return r.success ? undefined : r.error.errors[0]?.message;
              },
            }}
          >
            {(field) => (
              <div>
                <Label className="text-black/70 text-sm mb-1.5 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
                  Verification Code
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
                  className="bg-transparent border-black/[0.3] text-black placeholder:text-black/25 focus:border-orange-500/50 focus:ring-orange-500/20 h-11 text-center text-lg tracking-widest"
                  maxLength={6}
                />
                <FieldError message={field.state.meta.errors[0]} />
              </div>
            )}
          </form.Field>

          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                disabled={
                  !canSubmit ||
                  isSubmitting ||
                  verifyMutation.isPending ||
                  !email
                }
                size="lg"
                className="w-full bg-orange-500 hover:bg-orange-400 cursor-pointer text-white font-semibold shadow-lg shadow-orange-500/20 mt-4 gap-2"
              >
                {isSubmitting || verifyMutation.isPending
                  ? "Verifying..."
                  : "Verify account"}
                {!isSubmitting && !verifyMutation.isPending && (
                  <ArrowRight className="w-4 h-4" />
                )}
              </Button>
            )}
          </form.Subscribe>
        </form>

        {/* Resend code */}
        <div className="text-center mt-6">
          <p className="text-black/40 text-sm">
            Didn't receive the code?{" "}
            <button
              onClick={() => resendMutation.mutate()}
              disabled={resendMutation.isPending || !email}
              className="text-orange-500 hover:text-orange-400 cursor-pointer font-medium inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendMutation.isPending ? (
                <>Sending...</>
              ) : (
                <>
                  Resend <RefreshCw className="w-3 h-3" />
                </>
              )}
            </button>
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// Main page component with Suspense
export default function VerifyPage() {
  return (
    <div className="h-screen bg-[#0d0804] overflow-hidden">
      {/* Background effects */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(rgba(249,115,22,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.6) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative h-full flex items-center justify-center p-1">
        <Suspense fallback={<div>Loading...</div>}>
          <VerifyForm />
        </Suspense>
      </div>
    </div>
  );
}
