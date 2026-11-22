"use client";

import { Suspense, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { VelteLogo } from "@/components/VelteLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BuyerAuthShell } from "@/components/buyer/BuyerAuthShell";
import { ApiError } from "@/lib/api-client";
import { usersApi } from "@/services/users";
import type { AuthPanelContent, IconComponent } from "@/types/common";
import type { Buyer } from "@/types/buyer";
import { GoogleSignInButton } from "@/components/chat/GoogleSignInButton";
import {
  Eye,
  EyeSlash,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  Sparkle,
} from "@phosphor-icons/react";

const LOGIN_PANEL: AuthPanelContent = {
  headline: "Welcome back.",
  subtitle: "Sign in to manage your store, orders, and wallet.",
  features: [
    {
      icon: Sparkle as unknown as IconComponent,
      text: "Get discovered, manage orders, get paid",
    },
    {
      icon: ShieldCheck as unknown as IconComponent,
      text: "Your data stays private, always",
    },
  ],
};

const identifierSchema = z
  .string()
  .trim()
  .min(3, "Enter your email or username");
const passwordSchema = z.string().min(1, "Password is required");

function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return <p className="text-red-500 text-xs mt-1">{message}</p>;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");

  const [showPassword, setShowPassword] = useState(false);

  /* ── Buyer Google sign-in ─────────────────────────────────────────────── */
  function handleBuyerSignedIn(_buyer: Buyer) {
    const dest =
      redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
        ? redirectTo
        : "/";
    router.replace(dest);
  }

  /* ── Vendor email/password sign-in ───────────────────────────────────── */
  const loginMutation = useMutation({
    mutationFn: (data: { identifier: string; password: string }) =>
      usersApi.login(data),
    onSuccess: (result) => {
      toast.success("Welcome back!");
      if (result.accountType === "buyer" || result.buyer) {
        const dest =
          redirectTo &&
          redirectTo.startsWith("/") &&
          !redirectTo.startsWith("//")
            ? redirectTo
            : "/chat";
        router.replace(dest);
      } else {
        const dest =
          redirectTo &&
          redirectTo.startsWith("/") &&
          !redirectTo.startsWith("//")
            ? redirectTo.replace(/^\/[a-f0-9]{24}(\/|$)/, "/") || "/wallet"
            : "/wallet";
        router.replace(dest);
      }
    },
    onError: (error: unknown, variables) => {
      const message =
        error instanceof Error
          ? error.message
          : "Invalid email/username or password";
      const status = error instanceof ApiError ? error.status : 0;
      if (status !== 423) toast.error(message);
      if (status === 403) {
        const email =
          (error instanceof ApiError &&
            (error.data as { email?: string } | undefined)?.email) ||
          variables.identifier;
        router.push(`/auth/verify?email=${encodeURIComponent(email)}`);
      }
    },
  });

  const form = useForm({
    defaultValues: { identifier: "", password: "" },
    onSubmit: ({ value }) => {
      const identifier = identifierSchema.safeParse(value.identifier);
      const password = passwordSchema.safeParse(value.password);
      if (!identifier.success || !password.success) return;
      loginMutation.mutate({
        identifier: identifier.data,
        password: password.data,
      });
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-[440px]"
    >
      {/* Mobile logo */}
      <Link
        href="/"
        className="flex items-center gap-2.5 justify-center mb-6 lg:hidden"
      >
        <VelteLogo alt="Velte logo" width={72} height={35} priority />
      </Link>

      <div className="bg-surface border border-gray-100 sm:rounded-2xl p-8 shadow-md shadow-black/5">
        {/* Header */}
        <div className="mb-7 text-center">
          <h1 className="text-2xl font-bold text-ink mb-2 tracking-tight">
            Welcome back
          </h1>
          <p className="text-gray-500 text-sm">
            Sign in to your Velte account.
          </p>
        </div>

        {/* ── Google sign-in (buyers) ───────────────────────────────────── */}
        <GoogleSignInButton onSignedIn={handleBuyerSignedIn} variant="full" />

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400">or sign in with email</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        {/* ── Vendor email/password form ────────────────────────────────── */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className="space-y-5"
        >
          <form.Field
            name="identifier"
            validators={{
              onChange: ({ value }) => {
                const r = identifierSchema.safeParse(value);
                return r.success ? undefined : r.error.issues[0]?.message;
              },
            }}
          >
            {(field) => (
              <div>
                <Label className="text-gray-600 text-sm mb-1.5 flex items-center gap-2">
                  <User size={14} weight="bold" className="text-orange-400" />
                  Email or username
                </Label>
                <Input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="you@example.com"
                  className="h-11"
                  autoFocus
                />
                <FieldError message={field.state.meta.errors[0]} />
              </div>
            )}
          </form.Field>

          <form.Field
            name="password"
            validators={{
              onChange: ({ value }) => {
                const r = passwordSchema.safeParse(value);
                return r.success ? undefined : r.error.issues[0]?.message;
              },
            }}
          >
            {(field) => (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-gray-600 text-sm flex items-center gap-2">
                    <Lock size={14} weight="bold" className="text-orange-400" />
                    Password
                  </Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs text-orange-600 hover:text-orange-700"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Enter your password"
                    className="h-11 pr-10"
                    autoComplete="current-password"
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
                <FieldError message={field.state.meta.errors[0]} />
              </div>
            )}
          </form.Field>

          <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                disabled={!canSubmit || isSubmitting || loginMutation.isPending}
                size="lg"
                className="w-full bg-orange-500 hover:bg-orange-400 cursor-pointer text-white font-semibold shadow-lg shadow-orange-500/20 gap-2"
              >
                {loginMutation.isPending ? "Signing in..." : "Sign in"}
                {!loginMutation.isPending && (
                  <ArrowRight size={16} weight="bold" />
                )}
              </Button>
            )}
          </form.Subscribe>
        </form>

        <p className="text-center text-gray-400 text-sm mt-6">
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/signup"
            className="text-orange-600 hover:text-orange-700 font-medium"
          >
            Sign up
          </Link>
        </p>
      </div>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <BuyerAuthShell panel={LOGIN_PANEL}>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </BuyerAuthShell>
  );
}
