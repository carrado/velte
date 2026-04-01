"use client";

import { Suspense, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, ArrowRight, Key, AlertCircle, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import Image from "next/image";
import { passwordSchema } from "@/lib/password-utils";
import { PasswordStrengthMeter } from "@/components/passwordStrengthMeter";

// Shared FieldError component (can be moved to a shared file later)
function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return <p className="text-red-400 text-xs mt-1">{message}</p>;
}

// Inner component that uses useSearchParams
function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const resetMutation = useMutation({
    mutationFn: (data: { email: string; otp: string; password: string }) =>
      apiClient("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success("Password updated! You can now log in.");
      router.push("/login");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to reset password");
    },
  });

  const form = useForm({
    defaultValues: {
      otp: "",
      password: "",
      confirmPassword: "",
    },
    onSubmit: ({ value }) => {
      if (!email) return;
      resetMutation.mutate({
        email,
        otp: value.otp,
        password: value.password,
      });
    },
  });

  // If email is missing from URL, show an error message instead of the form
  if (!email) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-[440px]"
      >
        <div className="bg-white border border-white/[0.08] rounded-2xl p-8 shadow-2xl text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-black mb-2 tracking-tight">
            Invalid Request
          </h1>
          <p className="text-black/45 text-sm mb-6">
            The password reset link is invalid. Please request a new password
            reset link.
          </p>
          <Link href="/forgot-password">
            <Button className="w-full bg-orange-500 hover:bg-orange-400 text-white font-semibold shadow-lg shadow-orange-500/20 gap-2">
              Request new link
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative w-full max-w-[440px]"
    >
      <Link href="/" className="flex items-center gap-2.5 justify-center mb-3">
        <Image
          src="/velte_ijulb7ijulb7ijul_h3d6xw.png"
          alt="Velte"
          width={100}
          height={20}
        />
      </Link>

      <div className="bg-white border border-white/[0.08] rounded-2xl p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-black mb-2 tracking-tight">
            Reset your password
          </h1>
          <p className="text-black/45 text-sm">
            Enter the OTP sent to <strong>{email}</strong> and choose a new
            password.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className="space-y-5"
        >
          {/* OTP Field */}
          <form.Field
            name="otp"
            validators={{
              onChange: ({ value }) => {
                const r = z
                  .string()
                  .min(6, "OTP must be at least 6 characters")
                  .safeParse(value);
                return r.success ? undefined : r.error.errors[0]?.message;
              },
            }}
          >
            {(field) => (
              <div>
                <Label className="text-black/70 text-sm mb-1.5 flex items-center gap-2">
                  <Key className="w-3.5 h-3.5 text-orange-400" />
                  One-Time Password (OTP)
                </Label>
                <Input
                  type="text"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="6‑digit code"
                  className="bg-transparent border-black/[0.3] text-black focus:border-orange-500/50 h-11"
                />
                <FieldError message={field.state.meta.errors[0]} />
              </div>
            )}
          </form.Field>

          {/* Password Field with strength meter and eye toggle */}
          <form.Field
            name="password"
            validators={{
              onChange: ({ value }) => {
                const result = passwordSchema.safeParse(value);
                return result.success
                  ? undefined
                  : result.error.errors[0]?.message;
              },
            }}
          >
            {(field) => (
              <div>
                <Label className="text-black/70 text-sm mb-1.5 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-orange-400" />
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="••••••••"
                    className="bg-transparent border-black/[0.3] text-black placeholder:text-black/25 focus:border-orange-500/50 focus:ring-orange-500/20 h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black/60 focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <PasswordStrengthMeter password={field.state.value} />
                <FieldError message={field.state.meta.errors[0]} />
              </div>
            )}
          </form.Field>

          {/* Confirm Password Field with eye toggle */}
          <form.Field
            name="confirmPassword"
            validators={{
              onChange: ({ value, fieldApi }) => {
                const password = fieldApi.form.getFieldValue("password");
                if (!value) {
                  return "Please confirm your password";
                }
                if (value !== password) {
                  return "Passwords don't match";
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <div>
                <Label className="text-black/70 text-sm mb-1.5 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-orange-400" />
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="••••••••"
                    className="bg-transparent border-black/[0.3] text-black placeholder:text-black/25 focus:border-orange-500/50 focus:ring-orange-500/20 h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black/60 focus:outline-none"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
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
                  resetMutation.isPending ||
                  !email
                }
                size="lg"
                className="w-full bg-orange-500 hover:bg-orange-400 cursor-pointer text-white font-semibold shadow-lg shadow-orange-500/20 mt-4 gap-2"
              >
                {isSubmitting || resetMutation.isPending
                  ? "Updating..."
                  : "Update password"}
                {!isSubmitting && !resetMutation.isPending && (
                  <ArrowRight className="w-4 h-4" />
                )}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </div>
    </motion.div>
  );
}

// Main page component – wraps the form in Suspense
export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#0d0804] flex items-center justify-center p-5">
      <Suspense fallback={<div>Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
