"use client";

import { Suspense } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import Image from "next/image";

const resetSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z
      .string()
      .min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetForm = z.infer<typeof resetSchema>;

function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return <p className="text-red-400 text-xs mt-1">{message}</p>;
}

// Inner component that uses useSearchParams
function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const resetMutation = useMutation({
    mutationFn: (data: { token: string; password: string }) =>
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
      password: "",
      confirmPassword: "",
    } satisfies ResetForm,
    onSubmit: ({ value }) => {
      const parsed = resetSchema.safeParse(value);
      if (!parsed.success || !token) return;
      resetMutation.mutate({ token, password: value.password });
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
          <p className="text-black/45 text-sm">Choose a strong new password</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className="space-y-5"
        >
          {/* Password fields */}
          <form.Field
            name="password"
            validators={{
              onChange: ({ value }) => {
                const r = z
                  .string()
                  .min(8, "At least 8 characters")
                  .safeParse(value);
                return r.success ? undefined : r.error.errors[0]?.message;
              },
            }}
          >
            {(field) => (
              <div>
                <Label className="text-black/70 text-sm mb-1.5 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-orange-400" />
                  New Password
                </Label>
                <Input
                  type="password"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="••••••••"
                  className="bg-transparent border-black/[0.3] text-black focus:border-orange-500/50 h-11"
                />
                <FieldError message={field.state.meta.errors[0]} />
              </div>
            )}
          </form.Field>

          <form.Field
            name="confirmPassword"
            validators={{
              onChange: ({ value }) => {
                const r = z
                  .string()
                  .min(1, "Please confirm your password")
                  .safeParse(value);
                return r.success ? undefined : r.error.errors[0]?.message;
              },
            }}
          >
            {(field) => (
              <div>
                <Label className="text-black/70 text-sm mb-1.5 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-orange-400" />
                  Confirm Password
                </Label>
                <Input
                  type="password"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="••••••••"
                  className="bg-transparent border-black/[0.3] text-black focus:border-orange-500/50 h-11"
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
                  resetMutation.isPending ||
                  !token
                }
                size="lg"
                className="w-full bg-orange-500 hover:bg-orange-400 text-white font-semibold shadow-lg shadow-orange-500/20 mt-4 gap-2"
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
