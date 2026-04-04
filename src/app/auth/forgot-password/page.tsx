"use client";

import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import Image from "next/image";
import { passwordApi } from "@/services/password";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return <p className="text-red-400 text-xs mt-1">{message}</p>;
}

export default function ForgotPassword() {
  const router = useRouter();

  const forgotMutation = useMutation({
    mutationFn: (data: { email: string }) => passwordApi.sendOTP(data),
    onSuccess: (_, variables) => {
      toast.success("OTP sent to your email!");
      // Redirect to reset password page with email query param
      router.push(
        `/auth/reset-password?email=${encodeURIComponent(variables.email)}`,
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to send OTP");
    },
  });

  const form = useForm({
    defaultValues: {
      email: "",
    } satisfies ForgotPasswordForm,
    onSubmit: ({ value }) => {
      const parsed = forgotPasswordSchema.safeParse(value);
      if (!parsed.success) return;
      forgotMutation.mutate({ email: value.email });
    },
  });

  return (
    <div className="h-screen bg-[#0d0804] overflow-hidden sm:p-5">
      {/* Background effects */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(rgba(249,115,22,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.6) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative h-full flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative w-full max-w-[440px]"
        >
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 justify-center mb-3"
          >
            <Image
              src="/velte_ijulb7ijulb7ijul_h3d6xw.png"
              alt="Velte logo"
              width={100}
              height={20}
              priority
            />
          </Link>

          {/* Card */}
          <div className="bg-white border border-white/[0.08] sm:rounded-2xl p-8 shadow-2xl">
            {/* Header */}
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold text-black mb-2 tracking-tight">
                Forgot your password?
              </h1>
              <p className="text-black/45 text-sm">
                Enter your email and we'll send you a one-time password (OTP) to
                reset your password.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void form.handleSubmit();
              }}
              className="space-y-5"
            >
              {/* Email */}
              <form.Field
                name="email"
                validators={{
                  onChange: ({ value }) => {
                    const r = z
                      .string()
                      .email("Invalid email address")
                      .safeParse(value);
                    return r.success ? undefined : r.error.errors[0]?.message;
                  },
                }}
              >
                {(field) => (
                  <div>
                    <Label className="text-black/70 text-sm mb-1.5 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-orange-400" />
                      Email
                    </Label>
                    <Input
                      type="email"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="you@example.com"
                      className="bg-transparent border-black/[0.3] text-black placeholder:text-black/25 focus:border-orange-500/50 focus:ring-orange-500/20 h-11"
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
                      !canSubmit || isSubmitting || forgotMutation.isPending
                    }
                    size="lg"
                    className="w-full bg-orange-500 hover:bg-orange-400 cursor-pointer text-white font-semibold shadow-lg shadow-orange-500/20 mt-4 gap-2"
                  >
                    {isSubmitting || forgotMutation.isPending
                      ? "Sending..."
                      : "Send OTP"}
                    {!isSubmitting && !forgotMutation.isPending && (
                      <ArrowRight className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </form.Subscribe>
            </form>

            {/* Back to login link */}
            <p className="text-center text-black/40 text-sm mt-6">
              Remember your password?{" "}
              <Link
                href="/auth/login"
                className="text-orange-500 hover:text-orange-400 font-medium"
              >
                Log in
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
