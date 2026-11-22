"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  EnvelopeSimple,
  Eye,
  EyeSlash,
  Lock,
  User as UserIcon,
} from "@phosphor-icons/react";
import { GoogleSignInButton } from "@/components/chat/GoogleSignInButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usersApi } from "@/services/users";
import { passwordStrength } from "../schema";
import type { Buyer } from "@/types/buyer";

const buyerSignupSchema = z
  .object({
    name: z.string().trim().min(2, "Full name must be at least 2 characters"),
    email: z.string().trim().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type BuyerSignupFormValues = z.infer<typeof buyerSignupSchema>;

function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return <p className="text-red-500 text-xs mt-1">{message}</p>;
}

function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = passwordStrength(password);
  const getStrengthColor = () => {
    if (strength <= 2) return "bg-red-500";
    if (strength === 3) return "bg-yellow-500";
    if (strength === 4) return "bg-green-500";
    return "bg-green-600";
  };
  const getStrengthText = () => {
    if (strength <= 2) return "Weak";
    if (strength === 3) return "Fair";
    if (strength === 4) return "Good";
    return "Strong";
  };
  if (password.length === 0) return null;
  return (
    <div className="mt-1 space-y-1">
      <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${getStrengthColor()} transition-all duration-300`}
          style={{ width: `${(strength / 5) * 100}%` }}
        />
      </div>
      <p className={`text-xs ${getStrengthColor().replace("bg-", "text-")}`}>
        {getStrengthText()}
      </p>
    </div>
  );
}

interface Props {
  onBack: () => void;
}

export default function BuyerSignupPanel({ onBack }: Props) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  function handleGoogleSignedIn(_buyer: Buyer) {
    router.replace("/");
  }

  const signupMutation = useMutation({
    mutationFn: (data: { name: string; email: string; password: string }) =>
      usersApi.createBuyer(data),
    onSuccess: (_res, variables) => {
      toast.success(
        "Account created! Please check your email for the verification code.",
      );
      router.push(`/auth/verify?email=${encodeURIComponent(variables.email)}`);
    },
    onError: (error: Error) => {
      toast.error(
        error.message || "Failed to create account. Please try again.",
      );
    },
  });

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    } satisfies BuyerSignupFormValues,
    onSubmit: ({ value }) => {
      const parsed = buyerSignupSchema.safeParse(value);
      if (!parsed.success) {
        toast.error(
          parsed.error.issues[0]?.message ?? "Please fix the form errors.",
        );
        return;
      }
      signupMutation.mutate({
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
      });
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-[480px]"
    >
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 cursor-pointer transition-colors"
      >
        <ArrowLeft size={15} weight="bold" />
        Back
      </button>

      <div className="bg-surface border border-gray-100 sm:rounded-2xl p-8 shadow-md shadow-black/5">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-100 text-orange-500 text-xs font-semibold px-3 py-1 rounded-full mb-3">
            Buyer account
          </div>
          <h1 className="text-2xl font-bold text-ink mb-2 tracking-tight">
            Sign up as a Buyer
          </h1>
          <p className="text-gray-500 text-sm">
            Sign up to discover nearby vendors, track orders, and chat.
          </p>
        </div>

        {/* Google sign-in */}
        <GoogleSignInButton onSignedIn={handleGoogleSignedIn} variant="full" />

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">
            or sign up with email
          </span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Email/Password Signup Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className="space-y-4"
        >
          {/* Full Name */}
          <form.Field
            name="name"
            validators={{
              onChange: ({ value }) => {
                if (!value.trim()) return "Full name is required";
                if (value.trim().length < 2)
                  return "Name must be at least 2 characters";
                return undefined;
              },
            }}
          >
            {(field) => (
              <div>
                <Label className="text-gray-600 text-sm mb-1.5 flex items-center gap-2">
                  <UserIcon
                    size={14}
                    weight="bold"
                    className="text-orange-400"
                  />
                  Full Name
                </Label>
                <Input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="e.g. Jane Doe"
                  className="h-11"
                  autoFocus
                />
                <FieldError message={field.state.meta.errors[0]} />
              </div>
            )}
          </form.Field>

          {/* Email Address */}
          <form.Field
            name="email"
            validators={{
              onChange: ({ value }) => {
                const res = z.string().email().safeParse(value);
                return res.success
                  ? undefined
                  : "Please enter a valid email address";
              },
            }}
          >
            {(field) => (
              <div>
                <Label className="text-gray-600 text-sm mb-1.5 flex items-center gap-2">
                  <EnvelopeSimple
                    size={14}
                    weight="bold"
                    className="text-orange-400"
                  />
                  Email Address
                </Label>
                <Input
                  type="email"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="you@example.com"
                  className="h-11"
                />
                <FieldError message={field.state.meta.errors[0]} />
              </div>
            )}
          </form.Field>

          {/* Password */}
          <form.Field
            name="password"
            validators={{
              onChange: ({ value }) => {
                if (value.length < 6)
                  return "Password must be at least 6 characters";
                return undefined;
              },
            }}
          >
            {(field) => (
              <div>
                <Label className="text-gray-600 text-sm mb-1.5 flex items-center gap-2">
                  <Lock size={14} weight="bold" className="text-orange-400" />
                  Password
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Create a password (min 6 characters)"
                    className="h-11 pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    tabIndex={-1}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <PasswordStrengthMeter password={field.state.value} />
                <FieldError message={field.state.meta.errors[0]} />
              </div>
            )}
          </form.Field>

          {/* Confirm Password */}
          <form.Field
            name="confirmPassword"
            validators={{
              onChange: ({ value }) => {
                if (!value) return "Please confirm your password";
                if (value !== form.store.state.values.password)
                  return "Passwords don't match";
                return undefined;
              },
            }}
          >
            {(field) => (
              <div>
                <Label className="text-gray-600 text-sm mb-1.5 flex items-center gap-2">
                  <Lock size={14} weight="bold" className="text-orange-400" />
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Repeat your password"
                    className="h-11 pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    tabIndex={-1}
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeSlash size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
                <FieldError message={field.state.meta.errors[0]} />
              </div>
            )}
          </form.Field>

          {/* Submit button */}
          <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                disabled={
                  !canSubmit || isSubmitting || signupMutation.isPending
                }
                size="lg"
                className="w-full bg-orange-500 hover:bg-orange-400 cursor-pointer text-white font-semibold shadow-lg shadow-orange-500/20 gap-2 mt-2"
              >
                {signupMutation.isPending
                  ? "Creating account..."
                  : "Create Buyer Account"}
                {!signupMutation.isPending && (
                  <ArrowRight size={16} weight="bold" />
                )}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </div>
    </motion.div>
  );
}
